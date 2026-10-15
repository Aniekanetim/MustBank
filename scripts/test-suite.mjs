import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// CSV is the portable test-management export; no spreadsheet application is required.
const quote = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
const serialize = rows => '\uFEFF' + rows.map(row => row.map(quote).join(',')).join('\r\n') + '\r\n';
export async function loadCatalogue() {
  const catalogue = JSON.parse(await readFile('qa/test-cases/catalog.json', 'utf8'));
  assert.equal(catalogue.cases.length, 34);
  assert.equal(catalogue.coreIds.length, 8);
  assert.equal(new Set(catalogue.cases.map(c => c.id)).size, 34);
  assert.ok(catalogue.coreIds.every(id => catalogue.cases.some(c => c.id === id)));
  for (const c of catalogue.cases) assert.ok(c.preconditions && c.data && c.steps.length >= 2 && c.expected && c.automation, c.id);
  return catalogue;
}
export function observedResult(run, c) {
  const result = run.cases.find(item => item.id === c.id);
  assert.ok(result, `Missing actual execution: ${c.id}`);
  if (c.id === 'TC13') {
    const state = run.observations.TC13;
    return `After interruption: ${state.payments.length} payment(s), ${state.notifications.length} notification(s). Rollback event recorded: ${state.events.some(event => event.event === 'payment_rolled_back')}.`;
  }
  if (['TC10', 'TC11', 'TC13', 'TC14', 'TC16'].includes(c.id)) {
    const state = c.id === 'TC10' ? run.state : c.id === 'TC11' ? run.processObservation.afterRestart : run.observations[c.id];
    return `Observed ${state.payments.length} payment(s), NGN${(state.paidMinor / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} recorded and ${state.pendingNotifications} pending notification(s).`;
  }
  return result.result === 'passed' ? `Automated assertions passed: ${c.expected}` : result.error;
}
function row(catalogue, c, run) {
  const result = run?.cases.find(item => item.id === c.id);
  const steps = `Preconditions: ${c.preconditions}\n\n` + c.steps.map((step, i) => `${i + 1}. ${step}`).join('\n');
  const evidence = c.id === 'TC11' ? 'process/console.log; process/observation.json' : 'playwright/report.json; playwright/html-report/index.html';
  return [c.id, c.scenario, c.title, steps, c.data, c.expected,
    run ? observedResult(run, c) : '', result ? result.result === 'passed' ? 'Pass' : 'Fail' : 'Not Run',
    `${catalogue.coreIds.includes(c.id) ? 'Core assessment case' : 'Extended regression'}; Priority: ${c.priority}; Requirement: ${c.requirement}; ${c.framework}; ${c.automation}${run ? '; Evidence: ' + evidence + (result.result === 'failed' ? '; PAY-001 investigation' : '') : '; Actual results are recorded separately for each execution.'}`];
}
async function table(path, title, catalogue, cases, run) {
  await writeFile(path, serialize([[title, ...Array(8).fill('')], catalogue.columns, ...cases.map(c => row(catalogue, c, run))]));
}
export async function writeTestDesign() {
  const catalogue = await loadCatalogue();
  await mkdir('qa/test-cases', { recursive: true });
  await table('qa/test-cases/payroll-test-suite.csv', 'MustPayroll full test design: 34 checks. Execution results are recorded separately per build.', catalogue, catalogue.cases);
  await table('qa/test-cases/core-payroll-regression.csv', 'MustPayroll core assessment test design: 8 cases. Execution results are recorded separately per build.', catalogue, catalogue.cases.filter(c => catalogue.coreIds.includes(c.id)));
  return catalogue;
}
export async function writeExecutedTables(build, run, catalogue) {
  assert.deepEqual(run.cases.map(c => c.id).sort(), catalogue.cases.map(c => c.id).sort(), 'Every automated case must map to the designed suite.');
  const title = `MustPayroll ${build.variant === 'faulty' ? 'buggy' : 'fixed'} execution. Build: ${build.buildId}. Automated test URL: http://127.0.0.1:4184.`;
  await table(resolve(build.executionDirectory, 'test-results.csv'), title, catalogue, catalogue.cases, run);
  await table(resolve(build.executionDirectory, 'core-results.csv'), title, catalogue, catalogue.cases.filter(c => catalogue.coreIds.includes(c.id)), run);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await writeTestDesign();
  console.log('Generated the 8-case core suite and 34-case full suite in qa/test-cases.');
}
