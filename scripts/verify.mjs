import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { chromium } from '@playwright/test';
import { reportEvidence } from './report-evidence.mjs';
import { writeTestRecords } from './test-records.mjs';

const root = process.cwd(), evidence = resolve('assessment/evidence');
await mkdir(evidence, { recursive: true });
await mkdir('assessment/test-records', { recursive: true });
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run this through npm run verify.');
const clean = value => value.replace(/\u001b\[[0-9;]*m/g, '').split(root).join('<project>').split(root.replaceAll('\\', '/')).join('<project>');
const scrub = value => typeof value === 'string' ? clean(value) : Array.isArray(value) ? value.map(scrub) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, scrub(item)])) : value;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
async function run(name, args, extra = {}) {
  console.log(`\n${name}`);
  const child = spawn(process.execPath, args, { env: { ...process.env, ...extra }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = ''; for (const stream of [child.stdout, child.stderr]) stream.on('data', data => { output += data; process.stdout.write(data); });
  const code = await new Promise((done, reject) => { child.on('error', reject); child.on('close', done); });
  await writeFile(resolve(evidence, `${name}.log`), clean(output)); return code;
}
function specs(suite) { return [...(suite.specs ?? []), ...(suite.suites ?? []).flatMap(specs)]; }
function attachment(spec, name) { return spec.tests.flatMap(t => t.results).flatMap(r => r.attachments ?? []).find(a => a.name === name); }
async function save(spec, name, file) {
  const item = attachment(spec, name); assert.ok(item, `Missing evidence: ${name}`);
  const bytes = item.body ? Buffer.from(item.body, 'base64') : await readFile(item.path);
  await writeFile(resolve(evidence, file), bytes); return JSON.parse(bytes.toString());
}
async function verifyPackage(build) {
  const manifestBytes = await readFile(build.manifest);
  assert.equal(sha(manifestBytes), build.manifestSha256);
  assert.equal(sha(await readFile(build.archive)), build.archiveSha256);
  const manifest = JSON.parse(manifestBytes);
  for (const [file, hash] of Object.entries(manifest.fileSha256)) assert.equal(sha(await readFile(resolve(build.directory, file))), hash, `${build.variant} runtime changed: ${file}`);
}

assert.equal(await run('build', [npmCli, 'run', 'build:pair']), 0, 'Build failed.');
const pair = JSON.parse(await readFile('assessment/builds/pair.json', 'utf8'));
const runs = {};
for (const variant of ['faulty', 'fixed']) {
  const build = pair.builds[variant]; await verifyPackage(build);
  const processExit = await run(`${variant}-process`, ['--test', 'tests/service.test.mjs'], {
    PAYROLL_TEST_BUILD_DIR: resolve(build.directory), PAYROLL_PROCESS_RECORD: resolve(evidence, `${variant}-process.json`),
  });
  const processObservation = JSON.parse(await readFile(resolve(evidence, `${variant}-process.json`), 'utf8'));
  assert.equal(processExit, variant === 'faulty' ? 1 : 0, 'Unexpected persistence-check exit.');
  assert.equal(processObservation.first.paidMinor, 15000000);
  assert.equal(processObservation.afterRestart.paidMinor, variant === 'faulty' ? 30000000 : 15000000);
  assert.equal(processObservation.afterRestart.payments.length, variant === 'faulty' ? 2 : 1);
  const playwrightExit = await run(`${variant}-run`, ['node_modules/@playwright/test/cli.js', 'test'], { QUEST_BEHAVIOR: variant });
  const report = JSON.parse(await readFile(resolve(evidence, `${variant}-playwright.json`), 'utf8'));
  const all = report.suites.flatMap(specs);
  assert.equal(all.length, 33, 'The complete browser/API suite must execute against each build.');
  assert.equal(report.errors?.length ?? 0, 0, 'Unexpected runner error.');
  const failed = all.filter(s => s.tests.some(t => t.results.some(r => r.status !== 'passed'))).map(s => s.title.split(' | ')[0]).sort();
  assert.deepEqual(failed, variant === 'faulty' ? ['TC10', 'TC13', 'TC14', 'TC16'] : [], 'Unexpected failure set; inspect actual results.');
  assert.equal(playwrightExit, variant === 'faulty' ? 1 : 0);
  for (const spec of all) for (const test of spec.tests) {
    assert.equal(test.results.length, 1, 'No retries may disguise a result.');
    assert.ok(['passed', 'failed'].includes(test.results[0].status), 'Timeouts/skips are not business-defect evidence.');
  }
  const core = all.find(s => s.title.startsWith('TC10'));
  const state = await save(core, 'observed-workspace', `${variant}-workspace.json`);
  await save(core, 'first-attempt', `${variant}-first-attempt.json`);
  assert.equal(state.paidMinor, variant === 'faulty' ? 30000000 : 15000000);
  assert.equal(state.payments.length, variant === 'faulty' ? 2 : 1);
  assert.equal(state.pendingNotifications, variant === 'faulty' ? 1 : 0);
  if (variant === 'faulty') {
    const error = clean(core.tests[0].results[0].error?.message ?? '');
    assert.ok(error.includes('150,000.00') && error.includes('300,000.00'), 'TC10 must fail on the business amount.');
    const trace = attachment(core, 'trace'); assert.ok(trace?.path); await copyFile(trace.path, resolve(evidence, 'faulty-trace.zip'));
  }
  const video = attachment(core, 'video'); assert.ok(video?.path, 'Both test records require an actual browser recording.');
  await copyFile(video.path, resolve('assessment/test-records', `${variant}-TC10.webm`));
  const servedBuild = await save(all.find(s => s.title.startsWith('TC34')), 'served-build', `${variant}-served-build.json`);
  assert.equal(servedBuild.build.id, build.buildId);
  const observations = {};
  for (const id of ['TC13', 'TC14', 'TC16']) observations[id] = await save(all.find(s => s.title.startsWith(id)), `observed-${id}`, `${variant}-${id}.json`);
  assert.equal(observations.TC13.payments.length, variant === 'faulty' ? 1 : 0);
  assert.equal(observations.TC13.notifications.length, 0);
  for (const id of ['TC14', 'TC16']) {
    assert.equal(observations[id].paidMinor, variant === 'faulty' ? 30000000 : 15000000);
    assert.equal(observations[id].payments.length, variant === 'faulty' ? 2 : 1);
  }
  assert.equal(observations.TC14.providerAccepted, 1);
  assert.equal(observations.TC14.pendingNotifications, variant === 'faulty' ? 1 : 0);
  const cases = all.map(s => { const result = s.tests[0].results[0]; return { id: s.title.split(' | ')[0], title: s.title.split(' | ')[1], result: result.status, ...(result.error ? { error: clean(result.error.message) } : {}) }; });
  const processError = processExit ? `Expected 15000000 kobo after restart; observed ${processObservation.afterRestart.paidMinor} kobo and ${processObservation.afterRestart.payments.length} payments.` : undefined;
  cases.push({ id: 'TC11', title: 'Fresh process preserves employee-period payment identity', result: processExit ? 'failed' : 'passed', ...(processError ? { error: processError } : {}) });
  cases.sort((a, b) => a.id.localeCompare(b.id));
  runs[variant] = { state, processObservation, processExit, playwrightExit, cases, servedBuild, observations };
  await writeFile(resolve(evidence, `${variant}-playwright.json`), JSON.stringify(scrub(report), null, 2));
  await verifyPackage(build);
}
assert.deepEqual(runs.faulty.cases.map(c => c.id), runs.fixed.cases.map(c => c.id));
for (const [file, hash] of Object.entries(pair.sourceSha256)) assert.equal(sha(await readFile(file)), hash, `Source changed while testing: ${file}`);
await copyFile(resolve(evidence, 'fixed-process.log'), resolve(evidence, 'process-recovery.log'));
const browser = await chromium.launch({ channel: 'chromium' }), browserVersion = browser.version(); await browser.close();
const environment = { node: process.version, platform: process.platform, architecture: process.arch, chromium: browserVersion };
const summary = { application: 'MustPayroll', generatedAt: new Date().toISOString(), upstreamCommit: '73d83074e7ea0c40f8273455ebcb611b7088fd5a', environment,
  sourceFingerprint: pair.sourceFingerprint, testSuiteSha256: pair.testSuiteSha256, builds: pair.builds,
  faulty: { total: 34, passed: 29, failed: 5, failedCases: runs.faulty.cases.filter(c => c.result === 'failed').map(c => c.id), expectedAssertionFailure: true, paidMinor: runs.faulty.state.paidMinor, payments: runs.faulty.state.payments.length, pendingNotifications: runs.faulty.state.pendingNotifications },
  fixed: { playwrightPassed: 33, freshProcessPassed: 1, totalPassed: 34, paidMinor: runs.fixed.state.paidMinor, payments: runs.fixed.state.payments.length, pendingNotifications: runs.fixed.state.pendingNotifications },
  cases: runs.fixed.cases, sourceSha256: pair.sourceSha256 };
await writeFile(resolve(evidence, 'summary.json'), JSON.stringify(summary, null, 2));
await reportEvidence(evidence);
await writeTestRecords(pair, runs, environment);
console.log('\nTwo builds verified against the same 34 checks. Faulty: 29 pass / 5 fail. Fixed: 34 pass / 0 fail. See assessment/test-records/README.md.');
