# Prevent duplicate payment during payroll recovery

## Objective

An employee is owed ₦150,000 for one approved pay period. A successful payment followed by a notification failure must remain one payment when the original pay run is retried. This investigation reproduces the duplicate-payment failure and verifies the correction using the same expectations against two independent applications.

## Scope and business rule

MustPayroll uses synthetic employees, approved earnings, weekly pay periods, local payment records and simulated notification delivery. It does not move real funds. The [business rules and flow](Quality%20assurance/business_rules/README.md) define the UTC period, approval, earning IDs, amounts, payment identity, recovery and account/admin assumptions.

The [buggy application](../MustBank/Mustpayroll_buggy) deliberately preserves the selected defect. The [fixed application](../MustBank/MustPayroll_fixed) contains the correction. Each owns its source, server, build tools and database. All testing work is outside their container, in QA.

Taxes, statutory deductions, employee/account changes, external banking, authentication and distributed processing are outside scope.

## Quality assurance and quality control

Quality assurance defines how quality will be achieved and checked: the risk priorities in intent.md, the business acceptance rules and the release-gate criteria. Quality control applies those criteria to the applications through test design, execution, defect investigation and retesting. Both activities continue throughout development.

The Quality assurance folder owns those process and acceptance definitions. The Quality Control folder owns the cases, automation, separate execution records and defect findings. This directive connects them and records the resulting release judgment and handoff.

## Requirements and completion criteria

| Requirement | Completion criterion | Work |
|---|---|---|
| Prioritize at least three plausible failures | Compare impact, likelihood/uncertainty and effort; select one for investigation | [intent.md](Quality%20assurance/intent/intent.md) |
| Establish the rule and map the flow | Define qualifying inputs, decisions, payment, notification, recovery and account/admin assumptions | [Rules and flow](Quality%20assurance/business_rules/README.md) |
| Define at least eight cases | Inputs and expected outcomes cover happy path, cut-off, timezone, duplicate input, retry and partial failure | [Eight core cases](Quality%20Control/test_cases/core-payroll-regression.csv), [complete suite](Quality%20Control/test_cases/payroll-test-suite.csv) |
| Reproduce and prevent the selected failure | The same regression fails on the buggy build and passes on the fixed build; keep separate actual results | [Test project](Quality%20Control/execute_test_cases/test), [buggy execution](Quality%20Control/execute_test_cases/results/buggy/README.md), [fixed execution](Quality%20Control/execute_test_cases/results/fixed/README.md) |
| Explain the defect and release blockers | Reproduction, expected/actual result, severity, cause, evidence, correction and blocking checks are actionable | [PAY-001](Quality%20Control/bug_report/PAY-001.md) |
| Demonstrate the final run and judge readiness | Report results, remaining gaps, release decision and handoff | [Execution comparison](Quality%20Control/execute_test_cases/results/README.md), [release checklist](Quality%20assurance/release_readiness/README.md), instructions below |
| Submit a Loom of no more than five minutes | Candidate explains the case, verification, AI use, personal ownership and release judgment | Pending candidate recording; add its accessible URL below |

## Quality control results and verification evidence

The same eight core cases run against both builds with unchanged IDs, steps, inputs and expected results. The full suite contains 33 Playwright checks and one separate Node fresh-process check per build. Browser scenarios use shared page objects, with assertions in the specs. Each build has its own execution folder under Quality Control/execute_test_cases/results. These are automated results, not a claim that the candidate manually executed them.

| Build | Eight core cases | Complete suite | Completed results and execution evidence |
|---|---|---|---|
| Buggy | 6 passed, 2 failed: TC10 and TC13 | 29 passed, 5 failed | [Eight-case results](Quality%20Control/execute_test_cases/results/buggy/core-results.csv), [all results](Quality%20Control/execute_test_cases/results/buggy/test-results.csv), [logs and report](Quality%20Control/execute_test_cases/results/buggy/README.md) |
| Fixed | 8 passed, 0 failed | 34 passed, 0 failed | [Eight-case results](Quality%20Control/execute_test_cases/results/fixed/core-results.csv), [all results](Quality%20Control/execute_test_cases/results/fixed/test-results.csv), [logs and report](Quality%20Control/execute_test_cases/results/fixed/README.md) |

TC10 records two payments totaling ₦300,000 in the buggy build and one original ₦150,000 payment with recovered notification in the fixed build. The [defect report](Quality%20Control/bug_report/PAY-001.md) links the first attempt, state after retry, failed assertion and corrected execution. Each execution record identifies its application version and environment. The six passing core cases verify surrounding business rules; all eight are not required to fail in the buggy build.

## Release decision and remaining gaps

**Fixed application: ready with known limitations for local assessment review. Buggy application: not ready for release of the affected payroll flow.** The fixed result meets the [QA release gates](Quality%20assurance/release_readiness/README.md) within the tested local scope. The buggy retry still records two payments against one approved employee-period.

This decision is based on automated QC results and does not represent candidate personal sign-off or approval for live payroll.

- There is no real payroll provider, bank movement, funding check or bank reconciliation. Payment success means a local ledger commit.
- Taxes, statutory deductions, salaried proration, leave, benefits and employment compliance are excluded. These require independent product requirements and specialist review.
- Employee destinations are fixed. Account changes, employee departure, reversals, approval withdrawal and administrator overrides have no implemented policy beyond the stated scope.
- There is no authentication or production authorization. A workspace ID isolates fixtures; possession of it is not a security control. Keep the server on localhost.
- Scheduling is an explicit action using the original pay date. No background worker or real-time scheduling guarantee exists. The UI offers the fixture's October/early-November dates; the API validates Tuesday 09:00 UTC identities.
- SQLite runs synchronously in one Node process. The overlapping-request and graceful-restart checks do not establish distributed processing, real provider idempotency, abrupt termination or power-loss durability.
- Only desktop Chromium automation was run. No Firefox, WebKit, real-device, screen-reader, load, penetration or formal accessibility conformance assessment is claimed.
- No production incident frequency, actual employee loss or measured support reduction is known. No numerical assessment grade is self-assigned.

## Results/handoff appendix

1. Follow [SETUP.md](SETUP.md) to install dependencies and start the two local applications. The [repository branch](https://github.com/Aniekanetim/MustBank/tree/quest/rewards-settlement) contains both applications and the runnable test project.
2. From QA, run npm run verify to rebuild each app and execute the shared suite against each. Inspect both completed result tables and execution logs. Unexpected failures, skips, timeouts or retries block verification.
3. For manual reproduction, follow PAY-001 and prepare a fresh workspace in each build with the scenario commands in SETUP.md. Keep the original pay date and compare payment references before and after recovery.
4. If a successful payment has a pending message, use Notifications to retry delivery. Preserve the original payment reference and amount. If no payment exists, retry the original pay run and verify that previously successful entries remain unchanged.
5. If recorded pay differs from approved pay or an employee-period has duplicate payments, stop processing that workspace/period. Record the workspace, employee, original period, payment references/count/amount, notification state, attempted recovery and result. Hand the mismatch to engineering/QA for investigation and reconciliation. A manual database edit is not the demonstrated fix.
6. Use the [QA release checklist](Quality%20assurance/release_readiness/README.md) and the decision above for handoff. Passing this local reference does not approve real banking, tax, authentication or distributed-worker behavior.

## AI use, ownership and final submission

Codex assisted with implementation, test design, automated execution and document drafting. Aniekan directed the payroll setting, Playwright approach, separate builds/results and submission scope, and reported reviewing the application. Specific personal defect reproduction, code review and final sign-off have not been confirmed. His Loom must accurately explain what he reviewed and owned.

**Final Loom: pending.** Replace this line with an accessible recording URL before submission and confirm that its duration is no more than five minutes. Verify reviewer access to the repository and recording, and confirm the submission field, exact deadline/timezone, compensation terms and any additional rubric provided by the form or invitation. The reviewer assigns the assessment score.
