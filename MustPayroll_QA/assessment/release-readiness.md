# Release decision

**Ready with known limitations for local assessment review.** The corrected payroll flow passes 33 Playwright browser/API checks and one fresh-process check. The selected business assertion fails against the intentionally faulty implementation and passes against the correction. [Fixed build and test record](../executions/fixed/README.md). The separate [faulty build and test record](../executions/buggy/README.md) executes the same 34 checks: 29 pass and five fail for the recorded defect paths.

The faulty behavior is **not ready**: a notification failure followed by payroll retry records ₦300,000 against ₦150,000 of approved earnings. Keep it confined to the controlled reproduction. Neither implementation is approved for live payroll use.

## Release checklist

| Gate | Evidence and result |
|---|---|
| Employee-period payment equals approved earnings exactly once | TC01, TC05, TC10, TC15–TC17 pass in corrected flow |
| Period boundaries and explicit-offset timestamps | TC02–TC04, TC18 pass |
| Approval and immutable import identity | TC06–TC07, TC19–TC22 pass |
| Payment failure cannot produce notification | TC08–TC09 pass |
| Notification recovery cannot alter successful payment | TC10–TC12, TC14, TC32 pass |
| Atomic payment/outbox persistence and restart recovery | TC11, TC13 pass within the documented failure model |
| Review, cancellation, receipts, export and tab identity | TC23–TC27, TC30, TC33 pass |
| Responsive and keyboard workflow | TC28–TC29 pass in desktop Chromium emulation |
| Two builds and traceable execution | Separate application folders, runtime manifests and hashes; matching test-suite fingerprint in both test records; TC34 confirms served build and prevents switching |
| Evidence belongs to current payroll project | Current payroll reports, observed state and build identities replace previous banking evidence |
| Candidate ownership and final submission | Aniekan's review, Loom recording and submission details remain pending |

Any payment mismatch, duplicate employee-period key, notification before payment, orphan after rollback, lost payment identity after restart, or failed corrected regression blocks release of the affected flow. Re-run npm run verify after a relevant source change and keep evidence with the assessed version.

## Remaining gaps

- There is no real payroll provider, bank movement, funding check or bank reconciliation. Payment success means a local ledger commit.
- Taxes, statutory deductions, salaried proration, leave, benefits and employment compliance are excluded. These require independent product requirements and specialist review.
- Employee destinations are fixed. Account changes, employee departure, reversals, approval withdrawal and administrator overrides have no implemented policy beyond the stated scope.
- There is no authentication or production authorization. A workspace ID isolates fixtures; possession of it is not a security control. Keep the server on localhost.
- Scheduling is an explicit action using the original pay date. No background worker or real-time scheduling guarantee exists. The UI offers the fixture's October/early-November dates; the API validates Tuesday 09:00 UTC identities.
- SQLite runs synchronously in one Node process. The overlapping-request and graceful-restart checks do not establish distributed processing, real provider idempotency, abrupt termination or power-loss durability.
- Only desktop Chromium automation was run. No Firefox, WebKit, real-device, screen-reader, load, penetration or formal accessibility conformance assessment is claimed.
- No production incident frequency, actual employee loss or measured support reduction is known. No numerical assessment grade is self-assigned.

## Handoff

Use [README](../../README.md) to run the project and verify the correction. The [defect report](defect-report.md) gives the shortest manual reproduction. Preserve the original payment reference when recovering a notification. If a mismatch is detected, stop processing and reconcile payment records; this prototype does not implement a compensating reversal.

The first-attempt and after-retry records are linked in the [defect report](defect-report.md). The [directive handoff](directive.md#resultshandoff-appendix) explains recovery actions and when to stop processing a mismatch.

Aniekan reports reviewing the application. Before submission, personally confirm the case and evidence, record a Loom of no more than five minutes and add its accessible link to directive.md. Verify the actual submission field, deadline/timezone and any compensation or rubric terms provided by the form or invitation. Do not claim personal execution or sign-off that has not occurred.
