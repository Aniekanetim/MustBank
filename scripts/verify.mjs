import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { chromium } from '@playwright/test';

const root = process.cwd(), evidence = resolve('assessment/evidence');
await mkdir(evidence, { recursive: true });
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run this through npm run verify.');
const clean = value => value.replace(/\u001b\[[0-9;]*m/g, '').split(root).join('<project>').split(root.replaceAll('\\', '/')).join('<project>');
const scrub = value => typeof value === 'string' ? clean(value) : Array.isArray(value) ? value.map(scrub) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, scrub(item)])) : value;
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
  const item = attachment(spec, name); if (!item) throw new Error(`Missing evidence: ${name}`);
  const bytes = item.body ? Buffer.from(item.body, 'base64') : await readFile(item.path);
  await writeFile(resolve(evidence, file), bytes); return JSON.parse(bytes.toString());
}
if (await run('build', [npmCli, 'run', 'build'])) throw new Error('Build failed.');
if (await run('process-recovery', ['--test', 'tests/service.test.mjs'])) throw new Error('Fresh-process recovery failed.');
const redCode = await run('faulty-run', ['node_modules/@playwright/test/cli.js', 'test', '--grep', 'TC10'], { QUEST_BEHAVIOR: 'faulty' });
const red = JSON.parse(await readFile(resolve(evidence, 'faulty-playwright.json'), 'utf8')), redSpecs = red.suites.flatMap(specs);
if (redCode !== 1 || redSpecs.length !== 1 || !redSpecs[0].title.startsWith('TC10') || redSpecs[0].tests[0].results[0].status !== 'failed') throw new Error('Expected controlled regression failure was not observed.');
const redState = await save(redSpecs[0], 'observed-workspace', 'faulty-workspace.json'); await save(redSpecs[0], 'first-attempt', 'faulty-first-attempt.json');
if (redState.paidMinor !== 30000000 || redState.payments.length !== 2 || redState.pendingNotifications !== 1) throw new Error('Failure was not the selected duplicate payroll payment.');
const error = clean(redSpecs[0].tests[0].results[0].error?.message ?? '');
if (!error.includes('150,000.00') || !error.includes('300,000.00')) throw new Error('Regression did not assert the payroll business amount.');
const trace = attachment(redSpecs[0], 'trace'); if (trace?.path) await copyFile(trace.path, resolve(evidence, 'faulty-trace.zip'));
await writeFile(resolve(evidence, 'faulty-playwright.json'), JSON.stringify(scrub(red), null, 2));
const greenCode = await run('fixed-run', ['node_modules/@playwright/test/cli.js', 'test'], { QUEST_BEHAVIOR: 'fixed' });
const green = JSON.parse(await readFile(resolve(evidence, 'fixed-playwright.json'), 'utf8')), greenSpecs = green.suites.flatMap(specs);
if (greenCode || greenSpecs.length !== 32 || green.errors?.length || greenSpecs.some(s => s.tests.some(t => t.results.some(r => r.status !== 'passed')))) throw new Error('The corrected payroll suite did not pass all 32 browser/API checks.');
const core = greenSpecs.find(s => s.title.startsWith('TC10')), greenState = await save(core, 'observed-workspace', 'fixed-workspace.json');
await save(core, 'first-attempt', 'fixed-first-attempt.json');
if (greenState.paidMinor !== 15000000 || greenState.payments.length !== 1 || greenState.pendingNotifications !== 0) throw new Error('Corrected evidence did not demonstrate safe recovery.');
await writeFile(resolve(evidence, 'fixed-playwright.json'), JSON.stringify(scrub(green), null, 2));
const browser = await chromium.launch({ channel: 'chromium' }), browserVersion = browser.version(); await browser.close();
const sourceFiles = ['server/payroll.mjs', 'server/index.mjs', 'src/App.tsx', 'src/payroll.tsx', 'src/styles.css', 'src/main.tsx', 'src/components/ConfirmDialog.tsx', 'index.html', 'vite.config.ts', 'scripts/scenario.mjs', 'scripts/process-probe.mjs', 'scripts/verify.mjs', 'tests/helpers.ts', 'tests/payroll-api.spec.ts', 'tests/payroll-ui.spec.ts', 'tests/service.test.mjs', 'playwright.config.ts', 'package.json', 'package-lock.json'];
const hashes = {}; for (const file of sourceFiles) hashes[file] = createHash('sha256').update(await readFile(file)).digest('hex');
const summary = { application: 'MustPayroll', generatedAt: new Date().toISOString(), upstreamCommit: '73d83074e7ea0c40f8273455ebcb611b7088fd5a',
  environment: { node: process.version, platform: process.platform, architecture: process.arch, chromium: browserVersion },
  faulty: { case: 'TC10', expectedAssertionFailure: true, paidMinor: redState.paidMinor, payments: redState.payments.length, pendingNotifications: redState.pendingNotifications },
  fixed: { playwrightPassed: greenSpecs.length, freshProcessPassed: 1, totalPassed: greenSpecs.length + 1, paidMinor: greenState.paidMinor, payments: greenState.payments.length, pendingNotifications: greenState.pendingNotifications },
  cases: greenSpecs.map(s => ({ id: s.title.split(' | ')[0], title: s.title.split(' | ')[1], result: 'passed' })).concat([{ id: 'TC11', title: 'Fresh process preserves employee-period payment identity', result: 'passed' }]).sort((a,b) => a.id.localeCompare(b.id)), sourceSha256: hashes };
await writeFile(resolve(evidence, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(`\nVerified: faulty payroll doubles ₦150,000 to ₦300,000; corrected payroll retains one ₦150,000 payment. ${summary.fixed.totalPassed} checks passed. Evidence: ${relative(root, evidence)}.`);
