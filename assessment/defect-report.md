# PAY-001: Payroll retry creates a second employee payment

**Severity: P1 — release blocker for the affected payment flow.** A retry can make recorded pay exceed approved earnings. The severity describes the consequence of the controlled local defect; no real employee, loss or production incident is claimed.

## Rule and preconditions

Amara Okafor has one approved earning of ₦150,000 inside the 5–11 October 2026 UTC period. The pay date is 13 October at 09:00 UTC. The employee is owed one ₦150,000 payment. Notification recovery must preserve it.

Start the two separate application builds using the [README](../README.md), then prepare the failing example:

~~~sh
npm run scenario -- --build faulty --fail-notification
~~~

Open the printed pay-run URL. This workspace belongs to the separately packaged faulty application on port 4175. Its completion logic is fixed in that executable; the workspace does not select the implementation. The one-shot notification fault occurs before provider acceptance.

## Reproduce

1. Check that approved pay is ₦150,000 and recorded pay is ₦0.
2. Select Review and process payroll, then Process payroll in the confirmation dialog.
3. Inspect Payments and Notifications. One ₦150,000 payment exists; its notification is pending.
4. Return to Pay runs, select Retry pay run and confirm.
5. Inspect the employee breakdown and payment records.

| Observation | Expected | Faulty behavior |
|---|---|---|
| Payment count after retry | 1 | 2 |
| Recorded employee pay | ₦150,000 | ₦300,000 |
| Approved employee pay | ₦150,000 | ₦150,000 |
| Pending notification work after retry | 0 | 1 |

The interface surfaces the resulting payment mismatch. The release must still be blocked: detecting an incorrect payment after it is recorded is not prevention.

## Cause and correction

In [the faulty payment policy](../server/policies/faulty.mjs), processing checks a completion marker written only after notification success. The first payment commits, but delivery failure leaves the marker absent. Retry sees the entry as unprocessed and records another payment.

The [separate fixed policy](../server/policies/fixed.mjs) checks the durable employee-period payment identity, reinforces it with a unique index, and commits payment plus pending notification work atomically. Notification attempts occur after commit. Retry finds the original payment and recovers the existing message. It does not create another payment.

The [generated causal comparison](evidence/business-proof.md) reads the actual first-attempt and retry attachments. It confirms identical earning inputs, payment commit before the failed notification, two distinct faulty payment IDs for the same employee-period, and preservation of the complete corrected payment and original message identity. It fails to generate a successful report if those observed conditions do not hold.

Prepare the corrected example with the same earning and failure:

~~~sh
npm run scenario -- --build fixed --fail-notification
~~~

Repeat the same actions and expectation. The result is one ₦150,000 payment, unchanged approved pay and no pending notification after recovery.

## Evidence and release blockers

[TC10](../tests/payroll-ui.spec.ts) performs the UI actions and applies the same ₦150,000 assertion to both implementations. [Faulty state](evidence/faulty-workspace.json), [corrected state](evidence/fixed-workspace.json), [faulty screenshot](evidence/faulty-reproduction.png), [corrected screenshot](evidence/fixed-reproduction.png), [expected assertion failure](evidence/faulty-run.log) and [failure trace](evidence/faulty-trace.zip) make the result reviewable. The [summary](evidence/summary.json) records the assessed source fingerprints and environment.

Block release if retry changes an existing payment identity or amount, two fixed payments share an employee-period key, failed notification removes payment, failed payment emits a message, pre-commit interruption leaves an orphan, or period totals fail reconciliation. TC08–TC17 cover these paths, including fresh-process recovery. External banking and distributed workers require additional integration evidence before production use.

After the correction, use the [operations runbook](operations-runbook.md) to choose between notification recovery and an unpaid-entry retry. Escalate a mismatch with original references and state evidence; a manual database edit is not the demonstrated fix.

The [faulty build and its full test record](test-records/faulty.md) and [fixed build and its full test record](test-records/fixed.md) contain the package links, actual results and TC10 videos. Both execute the same 34 checks. The [policy patch](builds/fix.patch) isolates the correction. TC13 additionally exposes the non-atomic persistence weakness in the faulty build: an interruption leaves a payment without saved notification work. Its fixed transaction rolls both writes back.
