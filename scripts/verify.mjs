import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { chromium } from '@playwright/test';

const root = process.cwd();
const evidence = resolve('assessment/evidence');
await mkdir(evidence, { recursive: true });
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run this verification through npm run verify.');
const clean = value => value.replace(/\u001b\[[0-9;]*m/g, '').split(root).join('<project>').split(root.replaceAll('\\', '/')).join('<project>');
const scrub = value => typeof value === 'string' ? clean(value) : Array.isArray(value) ? value.map(scrub)
  : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, scrub(item)])) : value;
async function run(name, args, extraEnv = {}) {
  console.log(`\n${name}`);
  const child = spawn(process.execPath, args, { env: { ...process.env, ...extraEnv }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  for (const stream of [child.stdout, child.stderr]) stream.on('data', data => { output += data; process.stdout.write(data); });
  const code = await new Promise((done, reject) => { child.on('error', reject); child.on('close', done); });
  await writeFile(resolve(evidence, `${name}.log`), clean(output));
  return code;
}
function specs(suite) { return [...(suite.specs ?? []), ...(suite.suites ?? []).flatMap(specs)]; }
function attachment(spec, name) {
  return spec.tests.flatMap(test => test.results).flatMap(result => result.attachments ?? []).find(item => item.name === name);
}
async function saveAttachment(spec, name, destination) {
  const item = attachment(spec, name);
  if (!item) throw new Error(`Required evidence missing: ${name}`);
  const bytes = item.body ? Buffer.from(item.body, 'base64') : await readFile(item.path);
  await writeFile(resolve(evidence, destination), bytes);
  return JSON.parse(bytes.toString());
}
if (await run('build', [npmCli, 'run', 'build']) !== 0) throw new Error('Build failed.');
if (await run('process-recovery', ['--test', 'tests/service.test.mjs']) !== 0) throw new Error('Fresh-process recovery failed.');

const redCode = await run('faulty-run', ['node_modules/@playwright/test/cli.js', 'test', '--grep', 'TC10'], { QUEST_BEHAVIOR: 'faulty' });
const red = JSON.parse(await readFile(resolve(evidence, 'faulty-playwright.json'), 'utf8'));
const redSpecs = red.suites.flatMap(specs);
if (redCode !== 1 || redSpecs.length !== 1 || !redSpecs[0].title.startsWith('TC10')
    || redSpecs[0].tests[0].results[0].status !== 'failed') throw new Error('The controlled defect did not produce the required regression failure.');
const redState = await saveAttachment(redSpecs[0], 'observed-scenario', 'faulty-scenario.json');
await saveAttachment(redSpecs[0], 'first-attempt', 'faulty-first-attempt.json');
if (redState.totalCredits !== 20 || redState.payouts.length !== 2 || redState.pendingNotifications !== 1) throw new Error('The failure was not the intended duplicate payout.');
const redError = clean(redSpecs[0].tests[0].results[0].error?.message ?? '');
if (!redError.includes('10 credits') || !redError.includes('20 credits')) throw new Error('Regression failure did not compare the required business outcome.');
const trace = attachment(redSpecs[0], 'trace');
if (trace?.path) await copyFile(trace.path, resolve(evidence, 'faulty-trace.zip'));
await writeFile(resolve(evidence, 'faulty-playwright.json'), JSON.stringify(scrub(red), null, 2));

const greenCode = await run('fixed-run', ['node_modules/@playwright/test/cli.js', 'test'], { QUEST_BEHAVIOR: 'fixed' });
const green = JSON.parse(await readFile(resolve(evidence, 'fixed-playwright.json'), 'utf8'));
const greenSpecs = green.suites.flatMap(specs);
const failures = greenSpecs.filter(spec => spec.tests.some(test => test.results.some(result => result.status !== 'passed')));
if (greenCode !== 0 || failures.length || greenSpecs.length !== 33 || green.errors?.length) throw new Error('The fixed regression suite did not pass completely.');
const core = greenSpecs.find(spec => spec.title.startsWith('TC10'));
const greenState = await saveAttachment(core, 'observed-scenario', 'fixed-scenario.json');
await saveAttachment(core, 'first-attempt', 'fixed-first-attempt.json');
if (greenState.totalCredits !== 10 || greenState.payouts.length !== 1 || greenState.pendingNotifications !== 0) throw new Error('Fixed evidence did not confirm safe recovery.');
await writeFile(resolve(evidence, 'fixed-playwright.json'), JSON.stringify(scrub(green), null, 2));

const browser = await chromium.launch({ channel: 'chromium' });
const browserVersion = browser.version();
await browser.close();
const sourceFiles = ['server/rewards.mjs', 'server/index.mjs', 'src/pages/Rewards.tsx', 'src/pages/Settlements.tsx', 'src/pages/Dashboard.tsx', 'src/pages/Transactions.tsx', 'src/pages/Recipients.tsx', 'src/pages/Transfer.tsx', 'src/hooks/useRewards.ts', 'src/components/BankUI.tsx', 'scripts/scenario.mjs', 'src/store/storage.ts', 'src/store/bank.ts', 'src/App.tsx', 'src/main.tsx', 'src/styles.css', 'index.html', 'tests/rewards-api.spec.ts',
  'tests/rewards-ui.spec.ts', 'tests/service.test.mjs', 'tests/helpers.ts', 'playwright.config.ts', 'scripts/verify.mjs', 'package-lock.json'];
const hashes = {};
for (const file of sourceFiles) hashes[file] = createHash('sha256').update(await readFile(file)).digest('hex');
const summary = { generatedAt: new Date().toISOString(), upstreamCommit: '73d83074e7ea0c40f8273455ebcb611b7088fd5a',
  environment: { node: process.version, platform: process.platform, architecture: process.arch, chromium: browserVersion },
  faulty: { case: 'TC10', expectedAssertionFailure: true, credits: redState.totalCredits, payouts: redState.payouts.length, pendingNotifications: redState.pendingNotifications },
  fixed: { playwrightPassed: greenSpecs.length, freshProcessPassed: 1, totalPassed: greenSpecs.length + 1, credits: greenState.totalCredits, payouts: greenState.payouts.length, pendingNotifications: greenState.pendingNotifications },
  cases: greenSpecs.map(spec => ({ id: spec.title.split(' | ')[0], title: spec.title.split(' | ')[1], result: 'passed' })).concat([{ id: 'TC11', title: 'Fresh Node process retains payout and recovers notification', result: 'passed' }]).sort((a, b) => a.id.localeCompare(b.id)),
  sourceSha256: hashes };
await writeFile(resolve(evidence, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(`\nVerified: the faulty behavior fails TC10 at 20 credits; the fixed behavior passes ${summary.fixed.totalPassed} checks at 10 credits. Evidence: ${relative(root, evidence)}.`);
