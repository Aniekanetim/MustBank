# Before correction: faulty build test record

**29 passed; 5 failed; 34 executed. BLOCK RELEASE. The original payment is duplicated after a notification failure. The persistence-interruption case also exposes a payment without durable notification work.**

Build: mustpayroll-0.2.0-faulty-0dcbfc9d3580. Tested on 2026-10-15T17:26:18.892Z using v22.21.0 / Chromium 156.0.8078.4 on win32. These are automated execution results, not a claim of candidate manual sign-off.

## Build and test identity

- Application: [independent folder](../../builds/buggy); [runtime manifest](../../builds/buggy/build-manifest.json). Open a terminal in that folder and run npm start.
- Runtime SHA-256: 304ff4ac57087763086f53116fa6456a064264c9f50b27acb262a326a41deca8. This fingerprints the manifest's ordered application-file hashes; local database files are excluded.
- Shared source fingerprint: 0dcbfc9d35808c7a396f49bf2ce3cb3f0e26bebbde0e3885a50e4bd147731419.
- Shared test-suite fingerprint: eeb787a6d6eff160316d237854ee8b573d032b130b2e145eb6dc2df868e74003. Both records execute the same cases and positive business expectations.
- The served-build attachment matches this build ID and source fingerprint. TC34 also verifies that its API cannot switch to the opposite implementation.

## Reproduction and observed result

Input: one approved earning of NGN150,000 for Amara Okafor in the 5–12 October 2026 UTC period. Inject one notification failure before provider acceptance, process payroll, then retry the same pay run. Expected: retain exactly one NGN150,000 payment and recover its original pending notification.

Observed after retry: NGN300,000.00, 2 payment(s), 1 pending notification(s). The same TC10 assertion fails on the excess payment amount.

Watch the [actual TC10 browser recording](faulty-TC10.webm), inspect the [final screenshot](../evidence/faulty-reproduction.png), or read the [first attempt](../evidence/faulty-first-attempt.json) and [state after retry](../evidence/faulty-workspace.json). The browser recording is evidence from automation; the candidate's final Loom is a separate deliverable.

## Every executed case

Inputs and expected outcomes are in the [case register](../test-cases.md). Results below come from the Playwright report and the independent fresh-process check; no test is skipped or marked as an expected failure.

| Case | Check | Result | Failure observed |
|---|---|---|---|
| TC01 | Approved earnings aggregate into one payment per employee | PASSED | — |
| TC02 | Opening Monday midnight is included | PASSED | — |
| TC03 | Following Monday midnight belongs to the next period | PASSED | — |
| TC04 | Lagos offset is normalized before period selection | PASSED | — |
| TC05 | Reimporting an identical earning never increases pay | PASSED | — |
| TC06 | Conflicting duplicate rolls back the entire import | PASSED | — |
| TC07 | Pending approval blocks payment and leaves the period open | PASSED | — |
| TC08 | Failed payment creates no notification and can be retried | PASSED | — |
| TC09 | Notification failure preserves the successful payment | PASSED | — |
| TC10 | Retrying after notification failure preserves the approved payroll | FAILED | Expected NGN150,000 and one payment; observed NGN300,000 and two payments. |
| TC11 | Fresh process preserves employee-period payment identity | FAILED | Expected one payment after restart; observed 2 payments totaling NGN300000. |
| TC12 | Notification-only recovery never changes payment identity | PASSED | — |
| TC13 | Interruption rolls back payment and outbox together | FAILED | Expected no committed payment after interruption; observed 1 payment and 0 notifications. |
| TC14 | Lost provider acknowledgement recovers without duplicate acceptance | FAILED | Expected one payment and no pending notification; observed 2 payments and 1 pending notification. Provider acceptances remain 1. |
| TC15 | A processed period rejects new earnings and preserves approved totals | PASSED | — |
| TC16 | Eight overlapping requests in one server record one payment | FAILED | Expected NGN150,000 once; observed NGN300000 across 2 payments. |
| TC17 | The same employee can receive a separate payment in another period | PASSED | — |
| TC18 | Invalid dates and ambiguous timestamps are rejected | PASSED | — |
| TC19 | Amounts use positive bounded whole kobo | PASSED | — |
| TC20 | Unknown employees cannot acquire earnings or payments | PASSED | — |
| TC21 | Isolated workspaces do not share earnings or payment identity | PASSED | — |
| TC22 | Approval is explicit and replaying approval is harmless | PASSED | — |
| TC23 | Record, approve and process earnings through the interface | PASSED | — |
| TC24 | Cancelling payroll confirmation leaves the ledger and period unchanged | PASSED | — |
| TC25 | Receipt survives reload and can be copied and downloaded | PASSED | — |
| TC26 | Payment filter and CSV export contain the same employee records | PASSED | — |
| TC27 | Changing pay period separates approval and payment totals | PASSED | — |
| TC28 | Core screens reflow at 320 pixels without page overflow | PASSED | — |
| TC29 | Keyboard navigation reaches content and payroll confirmation | PASSED | — |
| TC30 | Employee details lead to the correct earning destination | PASSED | — |
| TC31 | Payroll screens use product language and show standard totals | PASSED | — |
| TC32 | Notification recovery is visible and leaves the receipt unchanged | PASSED | — |
| TC33 | Separate tabs retain their workspace and pay period after reload | PASSED | — |
| TC34 | Served build matches its package and cannot switch implementation | PASSED | — |

## Execution records and handoff

- [Browser/API report](../evidence/faulty-playwright.json), [console log](../evidence/faulty-run.log).
- [Fresh-process console log](../evidence/faulty-process.log), [before/restart state](../evidence/faulty-process.json).
- Related observed states: [TC13 interrupted persistence](../evidence/faulty-TC13.json), [TC14 lost acknowledgement](../evidence/faulty-TC14.json), [TC16 overlapping requests](../evidence/faulty-TC16.json).
- [Structured test record](faulty.json), [comparison](README.md), [PAY-001 defect report](../defect-report.md).
- Reproduce both runs from source with npm ci, npx playwright install --no-shell chromium, then npm run verify. The verifier updates both plain application folders without deleting their databases, checks their file hashes, executes the full suite against each, and regenerates both records. A failed corrected check or an unexpected faulty result fails verification.

No real funds, bank API or employee data were used. Browser coverage is Chromium. Single-server overlap is tested; distributed workers, real providers, permissions, taxes and statutory compliance are unverified.
