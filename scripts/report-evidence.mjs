import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export async function reportEvidence(directory = resolve('assessment/evidence')) {
  const load = async name => JSON.parse(await readFile(resolve(directory, name), 'utf8'));
  const summary = await load('summary.json');
  const state = async (variant, file) => JSON.parse(await readFile(resolve(summary.builds[variant].executionDirectory, 'evidence', file), 'utf8'));
  const [redFirst, red, greenFirst, green] = await Promise.all([state('faulty', 'first-attempt.json'), state('faulty', 'workspace.json'), state('fixed', 'first-attempt.json'), state('fixed', 'workspace.json')]);
  assert.equal(summary.application, 'MustPayroll');
  assert.deepEqual(redFirst.earnings, greenFirst.earnings, 'Both implementations must use the same business inputs.');
  for (const first of [redFirst, greenFirst]) {
    assert.equal(first.expectedMinor, 15000000); assert.equal(first.paidMinor, 15000000);
    assert.equal(first.payments.length, 1); assert.equal(first.pendingNotifications, 1);
    assert.equal(first.providerAccepted, 0);
    const commit = first.events.findIndex(e => e.event === 'payment_committed');
    const attempted = first.events.findIndex(e => e.event === 'notification_attempted');
    assert.ok(commit >= 0 && attempted > commit, 'Notification must follow payment commit.');
  }
  assert.equal(red.id, redFirst.id); assert.equal(green.id, greenFirst.id);
  assert.equal(red.paidMinor, 30000000); assert.equal(red.payments.length, 2);
  assert.equal(new Set(red.payments.map(p => p.id)).size, 2);
  assert.ok(red.payments.every(p => p.employeeId === 'emp-001' && p.periodStart === red.period.start));
  assert.equal(red.pendingNotifications, 1);
  assert.equal(green.paidMinor, 15000000); assert.equal(green.pendingNotifications, 0);
  assert.deepEqual(green.payments, greenFirst.payments, 'Recovery must preserve the original payment, not replace it.');
  assert.equal(green.notifications.length, 1); assert.equal(green.notifications[0].id, greenFirst.notifications[0].id);
  assert.equal(green.notifications[0].state, 'sent'); assert.equal(green.providerAccepted, 1);
  assert.ok(summary.cases.find(c => c.id === 'TC10' && c.result === 'passed'));
  assert.ok(summary.cases.find(c => c.id === 'TC11' && c.result === 'passed'));
  const observation = state => ({ workspaceId: state.id, employeeId: 'emp-001', periodStart: state.period.start,
    approvedMinor: state.expectedMinor, recordedMinor: state.paidMinor, paymentIds: state.payments.map(p => p.id),
    pendingNotifications: state.pendingNotifications, providerAcceptances: state.providerAccepted });
  const proof = { generatedAt: summary.generatedAt, currency: 'NGN', case: 'TC10',
    rule: 'One employee-period payment; notification recovery preserves that payment.',
    faulty: { first: observation(redFirst), retry: observation(red), excessRecordedMinor: red.paidMinor - red.expectedMinor },
    fixed: { first: observation(greenFirst), retry: observation(green), originalPaymentUnchanged: true, originalMessageRecovered: true },
    corroboration: { freshProcessCase: 'TC11', otherChecks: summary.cases.filter(c => c.id !== 'TC10').map(c => c.id) },
    limits: ['Local ledger only; no real bank movement.', 'Provider acceptance is simulated; real inbox delivery is unverified.', 'No production support baseline or measured ticket reduction is available.'] };
  await writeFile(resolve(directory, 'business-proof.json'), JSON.stringify(proof, null, 2) + '\n');
  const money = n => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(n / 100);
  const rows = [['Faulty: first attempt', redFirst], ['Faulty: retry', red], ['Corrected: first attempt', greenFirst], ['Corrected: retry', green]];
  const text = `# What happens when payroll recovery is retried?\n\n` +
    `**The employee is owed ${money(green.expectedMinor)}. The faulty retry records ${money(red.paidMinor)}; the correction retains the original ${money(green.paidMinor)} payment.**\n\n` +
    `Generated from the actual TC10 attachments by scripts/report-evidence.mjs. It rejects mismatched inputs, an incorrect failure, changed payment identity or an unrecovered corrected message. Run timestamp: ${summary.generatedAt}.\n\n` +
    `| Observed stage | Approved pay | Recorded pay | Payments | Pending notifications |\n|---|---|---|---|---|\n` +
    rows.map(([label, state]) => `| ${label} | ${money(state.expectedMinor)} | ${money(state.paidMinor)} | ${state.payments.length} | ${state.pendingNotifications} |`).join('\n') +
    `\n\nThe first attempts have identical earning inputs. Payment commits before notification is attempted. The injected notification failure occurs before provider acceptance, leaving one successful payment and one pending message in each implementation.\n\n` +
    `On retry, the faulty version creates a different payment ID for the same employee and period. The original payment still exists, so recorded pay exceeds approved pay by ${money(proof.faulty.excessRecordedMinor)}. This is observed excess in a synthetic ledger, not actual financial loss.\n\n` +
    `The corrected retry preserves the complete original payment object and recovers the original message. Its payment reference is ${green.payments[0].id}. Message state changes from pending to sent, with one simulated provider acceptance.\n\n` +
    `## Check the evidence\n\n` +
    `- First attempts: [faulty](../../qa/executions/buggy/evidence/first-attempt.json), [corrected](../../qa/executions/fixed/evidence/first-attempt.json).\n` +
    `- After retry: [faulty](../../qa/executions/buggy/evidence/workspace.json), [corrected](../../qa/executions/fixed/evidence/workspace.json).\n` +
    `- Machine-readable comparison: [business proof](business-proof.json).\n` +
    `- Same assertion: [expected failure](../../qa/executions/buggy/playwright/console.log), [corrected suite](../../qa/executions/fixed/playwright/console.log).\n` +
    `- Independent persistence checks: [faulty](../../qa/executions/buggy/process/console.log), [fixed](../../qa/executions/fixed/process/console.log).\n` +
    `- Other business boundaries: [case register](../test-cases.md), [environment and source fingerprints](summary.json).\n\n` +
    `## What this establishes\n\n` +
    `The correction prevents the selected duplicate-payment failure in the assessed fixtures and gives an operator a recovery path through the product. No manual database edit is required for the verified recovery. A failing corrected regression blocks this reference release.\n\n` +
    `This does not establish real bank movement, inbox delivery, distributed-worker safety or fewer production support tickets. There is no production baseline. [Operational follow-up](../operations-runbook.md) defines the evidence to collect and when to stop processing.\n`;
  await writeFile(resolve(directory, 'business-proof.md'), text);
  return proof;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await reportEvidence(); console.log('Business evidence generated from verified payroll observations.');
}
