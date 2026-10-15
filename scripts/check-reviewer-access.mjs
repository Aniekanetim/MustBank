import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

// A separate publication check: no tokens, browser cookies or GitHub CLI credentials.
const index = process.argv.indexOf('--ref');
const ref = index < 0 ? 'quest/rewards-settlement' : process.argv[index + 1];
if (!ref || !/^[a-zA-Z0-9/_-]{1,100}$/.test(ref)) throw new Error('Use a commit SHA or branch name.');
const repo = 'Aniekanetim/MustBank';
const raw = `https://raw.githubusercontent.com/${repo}/${ref}/`;
const files = ['README.md', 'qa/README.md', 'qa/executions/README.md', 'qa/test-cases/payroll-test-suite.csv', 'qa/test-cases/core-payroll-regression.csv',
  'assessment/intent.md', 'assessment/directive.md', 'assessment/test-cases.md', 'assessment/defect-report.md',
  'assessment/release-readiness.md', 'assessment/operations-runbook.md', 'assessment/ai-accountability.md', 'assessment/personal-review.md',
  'assessment/loom-script.md', 'assessment/evidence/summary.json', 'assessment/evidence/business-proof.md', 'assessment/evidence/business-proof.json',
  'assessment/builds/pair.json', 'assessment/builds/faulty-manifest.json', 'assessment/builds/fixed-manifest.json', 'assessment/builds/fix.patch', 'builds/README.md'];
for (const folder of ['buggy', 'fixed']) for (const file of ['README.md', 'run.json', 'core-results.csv', 'test-results.csv', 'playwright/report.json', 'playwright/console.log', 'process/console.log', 'process/observation.json', 'evidence/reproduction.png', 'evidence/PAY-001.webm']) files.push(`qa/executions/${folder}/${file}`);
const expectedHashes = {};
for (const folder of ['buggy', 'fixed']) {
  const manifestPath = `builds/${folder}/build-manifest.json`;
  const bytes = await readFile(manifestPath), manifest = JSON.parse(bytes);
  expectedHashes[manifestPath] = createHash('sha256').update(bytes).digest('hex');
  for (const [file, hash] of Object.entries(manifest.fileSha256)) expectedHashes[`builds/${folder}/${file}`] = hash;
}
files.push(...Object.keys(expectedHashes));
const checks = await Promise.all(files.map(file => ({ file, url: raw + file })).map(async item => {
  try {
    const response = await fetch(item.url, { credentials: 'omit', redirect: 'follow', signal: AbortSignal.timeout(30000), headers: { 'User-Agent': 'MustPayroll-reviewer-access-check' } });
    const bytes = Buffer.from(await response.arrayBuffer());
    let valid = response.ok && bytes.length > 0;
    if (item.file.endsWith('.json')) { try { JSON.parse(bytes.toString()); } catch { valid = false; } }
    if (item.file.endsWith('.png')) valid &&= bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a';
    if (item.file.endsWith('.csv')) valid &&= bytes.toString('utf8').includes('\"TC ID\",\"Test Scenario\",\"Test Case\"');
    if (item.file.endsWith('.webm')) valid &&= bytes.subarray(0, 4).toString('hex') === '1a45dfa3';
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    if (expectedHashes[item.file]) valid &&= sha256 === expectedHashes[item.file];
    return { ...item, status: response.status, accessibleWithoutCredentials: valid, bytes: bytes.length, sha256,
      ...(expectedHashes[item.file] ? { expectedSha256: expectedHashes[item.file] } : {}) };
  } catch (error) { return { ...item, accessibleWithoutCredentials: false, error: error.message }; }
}));
const report = { checkedAt: new Date().toISOString(), ref, repository: `https://github.com/${repo}`, credentialsSent: false,
  allAccessible: checks.every(c => c.accessibleWithoutCredentials), checks,
  exclusions: ['No final Loom URL supplied.', 'No genuine portfolio-case URLs supplied.', 'Access at this timestamp is not a guarantee of future hosting availability.'] };
await mkdir(resolve('assessment/evidence'), { recursive: true });
await writeFile(resolve('assessment/evidence/reviewer-access.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`${checks.filter(c => c.accessibleWithoutCredentials).length}/${checks.length} project and evidence links accessible without credentials at ${ref}.`);
if (!report.allAccessible) { console.error(checks.filter(c => !c.accessibleWithoutCredentials)); process.exitCode = 1; }
