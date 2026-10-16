import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// CSV is the portable test-management export; no spreadsheet application is required.
const quote = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
const serialize = rows => '\uFEFF' + rows.map(row => row.map(quote).join(',')).join('\r\n') + '\r\n';
export async function loadCatalogue() {
  const catalogue = JSON.parse(await readFile('../test_cases/catalog.json', 'utf8'));
  assert.equal(catalogue.cases.length, 34);
  assert.deepEqual(catalogue.columns, ['TC ID', 'Scenario', 'Test Case Desc', 'Preconditions', 'Steps', 'Test Data', 'Expected Result', 'Actual Result', 'Status', 'Comments']);
  assert.equal(catalogue.coreIds.length, 8);
  assert.equal(new Set(catalogue.cases.map(c => c.id)).size, 34);
  assert.ok(catalogue.coreIds.every(id => catalogue.cases.some(c => c.id === id)));
  for (const c of catalogue.cases) assert.ok(c.preconditions && c.data && c.steps.length >= 2 && c.expected && c.automation, c.id);
  return catalogue;
}
export function observedResult(run, c) {
  const result = run.cases.find(item => item.id === c.id);
  assert.ok(result, `Missing actual execution: ${c.id}`);
  const o = result.observation;
  assert.ok(o && Object.keys(o).length, `Missing recorded values: ${c.id}`);
  const money = value => `NGN ${new Intl.NumberFormat('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value / 100)}`;
  const yes = value => value ? 'Yes' : 'No';
  const amountIn = text => text.match(/₦[\d,.]+/)?.[0] ?? 'No currency value recorded';
  const payment = state => `${state.payments.length} payment record(s), ${money(state.paidMinor)} recorded pay`;
  switch (c.id) {
    case 'TC01': return `Approved payroll: ${money(o.after.expectedMinor)}. Recorded payroll: ${money(o.after.paidMinor)}.\nPayments: ${o.after.payments.map(p => `${p.employeeName} (${p.employeeId}): ${money(p.amountMinor)}`).join('; ')}.\nNotification states: ${o.after.notifications.map(n => n.state).join(', ')}.`;
    case 'TC02': return `Opening-boundary earning IDs included: ${o.after.earningIdsInPeriod.join(', ')}.\nRecorded pay: ${money(o.after.paidMinor)}.`;
    case 'TC03': return `13 October: ${money(o.first.paidMinor)} recorded; included earning IDs ${o.first.earningIdsInPeriod.join(', ')}.\n20 October: ${money(o.after.paidMinor)} recorded; included earning IDs ${o.after.earningIdsInPeriod.join(', ')}.\nPayment records across both periods: ${o.after.payments.length}.`;
    case 'TC04': return `Earning IDs included after UTC conversion: ${o.after.earningIdsInPeriod.join(', ')}.\nRecorded pay: ${money(o.after.paidMinor)}.`;
    case 'TC05': return `Earning records after repeated import: ${o.after.earnings.length} (${o.after.earnings.map(e => e.id).join(', ')}).\nRecorded pay: ${money(o.after.paidMinor)}.`;
    case 'TC06': return `Import response: HTTP ${o.responseStatus}.\nRemaining earnings: ${o.after.earnings.map(e => `${e.id}: ${money(e.amountMinor)}`).join('; ')}.\nNew earning saved: ${yes(o.after.earnings.some(e => e.id === 'new'))}.`;
    case 'TC07': return `Processing response: HTTP ${o.responseStatus}.\nPeriod locked: ${yes(o.after.locked)}. Payment records: ${o.after.payments.length}. Notification records: ${o.after.notifications.length}.`;
    case 'TC08': return `First attempt: ${payment(o.first)}; ${o.first.notifications.length} notification(s); ${o.first.providerAccepted} provider acceptance(s).\nAfter retry: ${payment(o.after)}.`;
    case 'TC09': return `${payment(o.after)}; ${o.after.pendingNotifications} pending notification(s); ${o.after.providerAccepted} provider acceptance(s).\nEvent positions: payment_committed ${o.after.events.indexOf('payment_committed') + 1}, notification_attempted ${o.after.events.indexOf('notification_attempted') + 1}.`;
    case 'TC10': return `First attempt: ${payment(o.first)}; ${o.first.pendingNotifications} pending notification(s).\nAfter payroll retry: ${payment(o.after)}; ${o.after.pendingNotifications} pending notification(s).\nPayment list unchanged: ${yes(o.paymentsUnchanged)}. Original payment reference still present: ${yes(o.after.payments.some(p => p.id === o.first.payments[0].id))}.\nNotification records after retry: ${o.after.notifications.length}. Original notification still present: ${yes(o.after.notifications.some(n => n.id === o.first.notifications[0].id))}.`;
    case 'TC11': return `Before close: ${payment(o.first)}; ${o.first.pendingNotifications} pending notification(s).\nFresh process after retry: ${payment(o.afterRestart)}; ${o.afterRestart.pendingNotifications} pending notification(s).\nOriginal payment reference still present: ${yes(o.afterRestart.payments.some(p => p.id === o.first.payments[0].id))}.`;
    case 'TC12': return `After notification-only recovery: ${payment(o.after)}; ${o.after.pendingNotifications} pending notification(s); ${o.after.providerAccepted} provider acceptance(s).\nComplete original payments array preserved: ${yes(o.paymentsUnchanged)}.`;
    case 'TC13': return `After interruption: ${o.first.payments.length} payment record(s), ${o.first.notifications.length} notification record(s). Rollback event recorded: ${yes(o.first.events.includes('payment_rolled_back'))}.\n` + (o.after ? `After retry: ${payment(o.after)}.` : 'The rollback assertion failed; the subsequent retry step was not executed.');
    case 'TC14': return `First attempt: ${o.first.providerAccepted} provider acceptance(s); ${o.first.pendingNotifications} pending notification(s).\nAfter retry: ${payment(o.after)}; ${o.after.providerAccepted} provider acceptance(s); ${o.after.pendingNotifications} pending notification(s).`;
    case 'TC15': return `Late-earning import: HTTP ${o.responseStatus}.\nAfter retry, approved pay: ${money(o.after.expectedMinor)}; recorded pay: ${money(o.after.paidMinor)}.`;
    case 'TC16': return `Completed overlapping requests: ${o.completedRequests}.\nFinal state: ${payment(o.after)}; ${o.after.pendingNotifications} pending notification(s).`;
    case 'TC17': return `20 October recorded pay: ${money(o.after.paidMinor)}.\nAcross both periods: ${o.after.runCount} pay runs and ${o.after.payments.length} payment records. Payment period starts: ${o.after.payments.map(p => p.periodStart).join(', ')}.`;
    case 'TC18': return o.invalidTimestamps.map(item => `${item.input}: HTTP ${item.status}`).join('\n') + `\nWednesday pay-run request: HTTP ${o.scheduleStatus}.`;
    case 'TC19': return o.invalidAmounts.map(item => `amountMinor ${JSON.stringify(item.input)}: HTTP ${item.status}`).join('\n') + `\nValid one-kobo earning: ${o.after.paidMinor} kobo recorded (${money(o.after.paidMinor)}).`;
    case 'TC20': return `Unknown-employee import: HTTP ${o.unknownEmployeeStatus}.\nEmpty approved payroll: HTTP ${o.emptyPayrollStatus}.`;
    case 'TC21': return `Workspace B after processing A: ${o.unpaidSecond.payments.length} payment record(s).\nAfter independently processing B: ${payment(o.after)}.`;
    case 'TC22': return `Approval states after first request and replay: ${o.approvalStates.join(', ')}. Rejected-earning approval: HTTP ${o.rejectedApprovalStatus}.\nIncluded earning IDs: ${o.after.earningIdsInPeriod.join(', ')}. Recorded pay: ${money(o.after.paidMinor)}.`;
    case 'TC23': return `Confirmation displayed ${amountIn(o.confirmationText)}.\nRecorded payroll: ${o.after.paidMinor} kobo (${money(o.after.paidMinor)}).`;
    case 'TC24': return `Dialog closed: ${yes(o.dialogClosed)}. Focus returned to the processing trigger: ${yes(o.triggerFocused)}.\nPeriod locked: ${yes(o.after.locked)}. Payment records: ${o.after.payments.length}.`;
    case 'TC25': return `Payment reference after reload: ${o.referenceText}.\nClipboard matched that reference: ${yes(o.clipboard === o.paymentId)}. Downloaded receipt contained Amara Okafor: ${yes(o.downloadText.includes('Amara Okafor'))}.`;
    case 'TC26': return `Visible filtered rows: ${o.visibleRows}.\nExport contained Daniel Mensah: ${yes(o.csv.includes('Daniel Mensah'))}; amount 200000.00: ${yes(o.csv.includes('200000.00'))}; Amara Okafor: ${yes(o.csv.includes('Amara Okafor'))}.`;
    case 'TC27': return `Selected period: ${o.period}.\nPayments recorded: ${o.recordedPay}. Pending approvals: ${o.pendingApprovals}.`;
    case 'TC28': return `Routes inspected: ${o.screens.length}.\nRoutes with horizontal page overflow: ${o.screens.filter(screen => !screen.fitsViewport).length}. Pay runs navigation fully in viewport: ${o.screens.filter(screen => screen.navigationInViewport).length}/${o.screens.length} routes.\nLoaded headings: ${o.screens.map(screen => screen.heading).join('; ')}.`;
    case 'TC29': return `Skip link focused main: ${yes(o.mainFocused)}. Route heading was ${o.routeHeading}; heading received focus: ${yes(o.headingFocused)}.\nCancel received initial dialog focus: ${yes(o.initialDialogFocus)}; Process payroll received the next Tab focus: ${yes(o.processButtonFocused)}; Escape restored trigger focus: ${yes(o.triggerFocusRestored)}.`;
    case 'TC30': return `Employee details: ${o.employeeName}. Masked account: ${o.maskedAccount}.\nEmployee selected on the earning form: ${o.selectedEmployee}.`;
    case 'TC31': return `Overview heading: ${o.heading}. Payroll amount displayed: ${amountIn(o.metrics)}.\nLegacy-label matches in rendered text: ${o.legacyLabelsFound.length}.`;
    case 'TC32': return `Initial delivery message: ${o.deliveryError}\nAfter recovery: ${payment(o.after)}; ${o.after.pendingNotifications} pending notification(s). Complete payments array unchanged: ${yes(o.paymentsUnchanged)}.\nRecovery message: ${o.recoveryMessage} Retry button disabled: ${yes(o.retryDisabled)}.`;
    case 'TC33': return `Tab A after reload: pay date ${o.firstDateAfterReload}, pending approvals ${o.firstPendingApprovals}. After selecting its original period, A displayed ${amountIn(o.firstOriginalMetrics)}.\nTab B after reload: pay date ${o.secondDateAfterReload}; displayed ${amountIn(o.secondMetrics)}.`;
    case 'TC34': return `Served build ID: ${o.servedBuild.id}.\nServed source fingerprint: ${o.servedBuild.sourceSha256}.\nOpposite-policy workspace request: HTTP ${o.policySwitchStatus}.`;
    default: throw new Error(`No actual-result formatter for ${c.id}.`);
  }
}
function row(catalogue, c, run, build) {
  const result = run?.cases.find(item => item.id === c.id);
  const steps = c.steps.map((step, i) => `${i + 1}. ${step}`).join('\n');
  const evidence = c.id === 'TC11' ? 'process/console.log; process/observation.json' : 'playwright/report.json; playwright/console.log';
  return [c.id, c.scenario, c.title, c.preconditions, steps, c.data, c.expected,
    run ? observedResult(run, c) : '', result ? result.result === 'passed' ? 'PASS' : 'FAIL' : 'NOT RUN',
    `${catalogue.coreIds.includes(c.id) ? 'Core assessment case' : 'Extended regression'}; Priority: ${c.priority}; Requirement: ${c.requirement}; ${c.framework}; ${c.automation}#${c.id}${run ? '; Build: ' + build.buildId + '; Evidence: ' + evidence + (result.result === 'failed' ? '; PAY-001 investigation' : '') : '; Actual results are recorded separately for each execution.'}`];
}
async function table(path, catalogue, cases, run, build) {
  await writeFile(path, serialize([catalogue.columns, ...cases.map(c => row(catalogue, c, run, build))]));
}
export async function writeTestDesign() {
  const catalogue = await loadCatalogue();
  await mkdir('../test_cases', { recursive: true });
  await table('../test_cases/payroll-test-suite.csv', catalogue, catalogue.cases);
  await table('../test_cases/core-payroll-regression.csv', catalogue, catalogue.cases.filter(c => catalogue.coreIds.includes(c.id)));
  return catalogue;
}
export async function writeExecutedTables(build, run, catalogue) {
  assert.deepEqual(run.cases.map(c => c.id).sort(), catalogue.cases.map(c => c.id).sort(), 'Every automated case must map to the designed suite.');
  await table(resolve(build.executionDirectory, 'test-results.csv'), catalogue, catalogue.cases, run, build);
  await table(resolve(build.executionDirectory, 'core-results.csv'), catalogue, catalogue.cases.filter(c => catalogue.coreIds.includes(c.id)), run, build);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await writeTestDesign();
  console.log('Generated the 8-case core suite and 34-case full suite in ../test_cases.');
}
