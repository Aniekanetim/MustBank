# Release quality gates

This checklist defines the process and acceptance conditions for recommending a release. QC supplies the execution results; the [directive](../directive.md#release-decision-and-remaining-gaps) records the actual decision and limits.

## Entry criteria

- The [business rules and flow](business_rules.md) define the pay period, earning eligibility, payment identity, notification order, recovery and account/admin assumptions.
- The selected risk and alternatives are explained in [intent.md](intent.md). Unknown frequency and excluded behavior remain explicit.
- The buggy and fixed applications use the same synthetic fixture and business expectations. Each execution identifies the application version and environment.
- The QC cases cover the happy path, cut-off boundary, timezone conversion, duplicate input, retry and partial failure before execution begins.

## Required release conditions

| Quality gate | Required outcome | QC verification |
|---|---|---|
| Approved payroll and payment identity | Each employee-period receives its approved total once; repeated inputs and retries do not increase it | TC01, TC05, TC10, TC15–TC17 |
| Period and timezone rules | Opening boundary is included, closing boundary excluded, and explicit-offset timestamps are normalized before selection | TC02–TC04, TC18 |
| Eligibility and import integrity | Approval is explicit; conflicting input, invalid amounts and unknown employees cannot create incorrect pay | TC06–TC07, TC19–TC22 |
| Payment and notification ordering | Failed payment creates no notification; failed notification cannot reverse or repeat payment | TC08–TC12, TC14, TC32 |
| Persistence and recovery | Interrupted pre-commit work leaves neither payment nor message; a fresh process preserves committed payment identity | TC11, TC13 |
| Operator workflows | Review, cancellation, receipts, export, period selection and separate tabs preserve the selected records and totals | TC23–TC27, TC30–TC33 |
| Basic interface access | The tested keyboard and narrow-screen workflows remain usable within the stated Chromium scope | TC28–TC29 |
| Assessed build and test integrity | The same suite runs against both applications; the served application matches the target and rejects switching implementation | TC34 and both execution records |

## Exit and sign-off conditions

1. The corrected application passes all checks within the agreed scope. The selected regression fails on the deliberately buggy application and passes on the fixed application without changing its expectation.
2. All eight core cases execute against both applications. Case IDs, inputs, expected results and actual results remain traceable. Unexpected failures, skips, timeouts and test retries prevent a successful verification.
3. The [defect report](../Quality%20Control/bug_report/PAY-001.md) explains the cause and prevention. Any payment mismatch, duplicate payment, notification before payment or orphan payment blocks release of the affected flow.
4. The actual [QC results](../Quality%20Control/execute_test_cases/results/README.md) support the readiness decision. Remaining gaps are recorded in the directive, and the decision is limited to verified behavior.
5. Candidate ownership, final Loom and submission checks are completed before the application is submitted. Automated execution does not substitute for personal sign-off.

After a relevant rule or implementation change, review the affected cases and repeat verification. A passing local fixture does not approve unverified bank, tax, authentication or distributed-worker behavior.
