import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { chromium } from '@playwright/test';
import { writeTestRecords } from './test-records.mjs';

const root = resolve('../../..');
await mkdir('results', { recursive: true });
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run this through npm run verify.');
const clean = value => value.replace(/\u001b\[[0-9;]*m/g, '').split(root).join('<project>').split(root.replaceAll('\\', '/')).join('<project>');
const scrub = value => typeof value === 'string' ? clean(value) : Array.isArray(value) ? value.map(scrub) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, scrub(item)])) : value;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
async function run(name, args, extra = {}, logFile = null) {
  console.log(`\n${name}`);
  const child = spawn(process.execPath, args, { env: { ...process.env, ...extra }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = ''; for (const stream of [child.stdout, child.stderr]) stream.on('data', data => { output += data; process.stdout.write(data); });
  const code = await new Promise((done, reject) => { child.on('error', reject); child.on('close', done); });
  if (logFile) await writeFile(logFile, clean(output)); return code;
}
function specs(suite) { return [...(suite.specs ?? []), ...(suite.suites ?? []).flatMap(specs)]; }
function attachment(spec, name) { return spec.tests.flatMap(t => t.results).flatMap(r => r.attachments ?? []).find(a => a.name === name); }
async function save(spec, name, file) {
  const item = attachment(spec, name); assert.ok(item, `Missing evidence: ${name}`);
  const bytes = item.body ? Buffer.from(item.body, 'base64') : await readFile(item.path);
  await writeFile(resolve(file), bytes); return JSON.parse(bytes.toString());
}
async function verifyBuild(build) {
  const manifestBytes = await readFile(build.manifest);
  assert.equal(sha(manifestBytes), build.manifestSha256);
  const manifest = JSON.parse(manifestBytes);
  assert.equal(sha(await readFile(resolve(build.directory, 'build-manifest.json'))), build.manifestSha256);
  assert.equal(sha(JSON.stringify(manifest.fileSha256)), build.runtimeSha256);
  for (const [file, hash] of Object.entries(manifest.fileSha256)) assert.equal(sha(await readFile(resolve(build.directory, file))), hash, `${build.variant} runtime changed: ${file}`);
}

assert.equal(await run('build', [npmCli, 'run', 'build:pair']), 0, 'Build failed.');
const pair = JSON.parse(await readFile('results/builds.json', 'utf8'));
const runs = {};
for (const variant of ['faulty', 'fixed']) {
  const build = pair.builds[variant]; await verifyBuild(build);
  const execution = resolve(build.executionDirectory);
  for (const folder of ['playwright', 'process', 'evidence']) await mkdir(resolve(execution, folder), { recursive: true });
  const processExit = await run(`${variant}-process`, ['--test', 'test/service.test.mjs'], {
    PAYROLL_TEST_BUILD_DIR: resolve(build.directory), PAYROLL_PROCESS_RECORD: resolve(execution, 'process/observation.json'),
  }, resolve(execution, 'process/console.log'));
  const processObservation = JSON.parse(await readFile(resolve(execution, 'process/observation.json'), 'utf8'));
  assert.equal(processExit, variant === 'faulty' ? 1 : 0, 'Unexpected persistence-check exit.');
  assert.equal(processObservation.first.paidMinor, 15000000);
  assert.equal(processObservation.afterRestart.paidMinor, variant === 'faulty' ? 30000000 : 15000000);
  assert.equal(processObservation.afterRestart.payments.length, variant === 'faulty' ? 2 : 1);
  const playwrightExit = await run(`${variant}-run`, ['node_modules/@playwright/test/cli.js', 'test', '--config', 'playwright.config.ts'], { QUEST_BEHAVIOR: variant }, resolve(execution, 'playwright/console.log'));
  const report = JSON.parse(await readFile(resolve(execution, 'playwright/report.json'), 'utf8'));
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
  const state = await save(core, 'observed-workspace', resolve(execution, 'evidence/workspace.json'));
  const first = await save(core, 'first-attempt', resolve(execution, 'evidence/first-attempt.json'));
  assert.equal(state.paidMinor, variant === 'faulty' ? 30000000 : 15000000);
  assert.equal(state.payments.length, variant === 'faulty' ? 2 : 1);
  assert.equal(state.pendingNotifications, variant === 'faulty' ? 1 : 0);
  if (variant === 'faulty') {
    const error = clean(core.tests[0].results[0].error?.message ?? '');
    assert.ok(error.includes('150,000.00') && error.includes('300,000.00'), 'TC10 must fail on the business amount.');
  }
  const servedBuild = await save(all.find(s => s.title.startsWith('TC34')), 'served-build', resolve(execution, 'evidence/served-build.json'));
  assert.equal(servedBuild.build.id, build.buildId);
  const observations = {};
  for (const id of ['TC13', 'TC14', 'TC16']) observations[id] = await save(all.find(s => s.title.startsWith(id)), `observed-${id}`, resolve(execution, `evidence/${id}.json`));
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
  runs[variant] = { first, state, processObservation, processExit, playwrightExit, cases, servedBuild, observations };
  await writeFile(resolve(execution, 'playwright/report.json'), JSON.stringify(scrub(report), null, 2));
  await verifyBuild(build);
}
assert.deepEqual(runs.faulty.cases.map(c => c.id), runs.fixed.cases.map(c => c.id));
for (const [file, hash] of Object.entries(pair.sourceSha256)) assert.equal(sha(await readFile(file)), hash, `Source changed while testing: ${file}`);
const browser = await chromium.launch({ channel: 'chromium' }), browserVersion = browser.version(); await browser.close();
const environment = { node: process.version, platform: process.platform, architecture: process.arch, chromium: browserVersion };
assert.deepEqual(runs.faulty.first.earnings, runs.fixed.first.earnings, 'Before/after verification must use identical earnings.');
await writeTestRecords(pair, runs, environment);
console.log('\nTwo builds verified against the same 34 checks. Faulty: 29 pass / 5 fail. Fixed: 34 pass / 0 fail. See README.md.');
