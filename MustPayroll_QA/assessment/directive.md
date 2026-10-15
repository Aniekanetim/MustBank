# Prevent duplicate payment during payroll recovery

## Objective

An employee is owed ₦150,000 for one approved pay period. A successful payment followed by a notification failure must remain one payment when the original pay run is retried. This investigation reproduces the duplicate-payment failure and verifies the correction using the same expectations against two independent applications.

## Scope and business rule

MustPayroll uses synthetic employees, approved earnings, weekly pay periods, local payment records and simulated notification delivery. It does not move real funds. The [business rules and flow](business-rules.md) define the UTC period, approval, earning IDs, amounts, payment identity, recovery and account/admin assumptions.

The [buggy application](../../MustBank/Mustpayroll_buggy) deliberately preserves the selected defect. The [fixed application](../../MustBank/MustPayroll_fixed) contains the correction. Each owns its source, server, build tools and database. All testing work is outside their container, in MustPayroll_QA.

Taxes, statutory deductions, employee/account changes, external banking, authentication and distributed processing are outside scope.

## Requirements and completion criteria

| Requirement | Completion criterion | Work |
|---|---|---|
| Prioritize at least three plausible failures | Compare impact, likelihood/uncertainty and effort; select one for investigation | [intent.md](intent.md) |
| Establish the rule and map the flow | Define qualifying inputs, decisions, payment, notification, recovery and account/admin assumptions | [Rules and flow](business-rules.md) |
| Define at least eight cases | Inputs and expected outcomes cover happy path, cut-off, timezone, duplicate input, retry and partial failure | [Eight core cases](../test-cases/core-payroll-regression.csv), [complete suite](../test-cases/payroll-test-suite.csv) |
| Reproduce and prevent the selected failure | The same regression fails on the buggy build and passes on the fixed build; keep separate actual results | [Test project](../tests), [buggy execution](../executions/buggy/README.md), [fixed execution](../executions/fixed/README.md) |
| Explain the defect and release blockers | Reproduction, expected/actual result, severity, cause, evidence, correction and blocking checks are actionable | [PAY-001](defect-report.md) |
| Demonstrate the final run and judge readiness | Report results, remaining gaps, release decision and handoff | [Execution comparison](../executions/README.md), [release checklist](release-readiness.md), instructions below |
| Submit a Loom of no more than five minutes | Candidate explains the case, verification, AI use, personal ownership and release judgment | Pending candidate recording; add its accessible URL below |

## Results and verification evidence

The same eight core cases run against both builds with unchanged IDs, steps, inputs and expected results. The full suite contains 33 Playwright checks and one separate Node fresh-process check per build. These are automated results, not a claim that the candidate manually executed them.

| Build | Eight core cases | Complete suite | Completed results and execution evidence |
|---|---|---|---|
| Buggy | 6 passed, 2 failed: TC10 and TC13 | 29 passed, 5 failed | [Eight-case results](../executions/buggy/core-results.csv), [all results](../executions/buggy/test-results.csv), [logs and report](../executions/buggy/README.md) |
| Fixed | 8 passed, 0 failed | 34 passed, 0 failed | [Eight-case results](../executions/fixed/core-results.csv), [all results](../executions/fixed/test-results.csv), [logs and report](../executions/fixed/README.md) |

TC10 records two payments totaling ₦300,000 in the buggy build and one original ₦150,000 payment with recovered notification in the fixed build. The [defect report](defect-report.md) links the first attempt, state after retry, failed assertion and corrected execution. Each execution record identifies its application version and environment. The six passing core cases verify surrounding business rules; all eight are not required to fail in the buggy build.

## Results/handoff appendix

1. Follow [SETUP.md](../SETUP.md) to install dependencies and start the two local applications. The [repository branch](https://github.com/Aniekanetim/MustBank/tree/quest/rewards-settlement) contains both applications and the runnable test project.
2. From MustPayroll_QA, run npm run verify to rebuild each app and execute the shared suite against each. Inspect both completed result tables and execution logs. Unexpected failures, skips, timeouts or retries block verification.
3. For manual reproduction, follow PAY-001 and prepare a fresh workspace in each build with the scenario commands in SETUP.md. Keep the original pay date and compare payment references before and after recovery.
4. If a successful payment has a pending message, use Notifications to retry delivery. Preserve the original payment reference and amount. If no payment exists, retry the original pay run and verify that previously successful entries remain unchanged.
5. If recorded pay differs from approved pay or an employee-period has duplicate payments, stop processing that workspace/period. Record the workspace, employee, original period, payment references/count/amount, notification state, attempted recovery and result. Hand the mismatch to engineering/QA for investigation and reconciliation. A manual database edit is not the demonstrated fix.
6. Use the [release checklist and gaps](release-readiness.md) for the bounded decision. Passing this local reference does not approve real banking, tax, authentication or distributed-worker behavior.

## AI use, ownership and final submission

Codex assisted with implementation, test design, automated execution and document drafting. Aniekan directed the payroll setting, Playwright approach, separate builds/results and submission scope, and reported reviewing the application. Specific personal defect reproduction, code review and final sign-off have not been confirmed. His Loom must accurately explain what he reviewed and owned.

**Final Loom: pending.** Replace this line with an accessible recording URL before submission and confirm that its duration is no more than five minutes. Verify reviewer access to the repository and recording, and confirm the submission field, exact deadline/timezone, compensation terms and any additional rubric provided by the form or invitation. The reviewer assigns the assessment score.
