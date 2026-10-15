# MustPayroll QA project

This project contains the runnable test suite, shared case definitions and separate test execution records for the [buggy application](../MustBank/Mustpayroll_buggy) and [fixed application](../MustBank/MustPayroll_fixed). It sits outside MustBank.

## Required submission work

| Work | Location |
|---|---|
| Problem choice and prioritization | [intent.md](assessment/intent.md) |
| Objective, scope, requirements, completion criteria, results and handoff | [directive.md](assessment/directive.md) |
| Business rules, mapped flow and assumptions | [Business rules](assessment/business-rules.md) |
| Runnable test project and fixtures | [Setup](SETUP.md), [tests](tests), [execution scripts](scripts) |
| Eight core cases and full 34-check suite | [Core cases](test-cases/core-payroll-regression.csv), [complete suite](test-cases/payroll-test-suite.csv) |
| Separate actual results and execution evidence | [Buggy execution](executions/buggy/README.md), [fixed execution](executions/fixed/README.md) |
| Actionable defect and root cause | [PAY-001](assessment/defect-report.md) |
| Release checklist, remaining gaps and readiness decision | [Release readiness](assessment/release-readiness.md) |
| Candidate Loom, no more than five minutes | Link remains pending in directive.md |

## Test organization

The same eight core cases run against each application with unchanged preconditions, steps, inputs and expected results. Each execution folder contains its own completed CSV tables, run record, Playwright report/log, fresh-process result/log and relevant state evidence.

| Case | Coverage | Buggy | Fixed |
|---|---|---|---|
| TC01 | Approved payroll aggregation | Pass | Pass |
| TC03 | Closing UTC boundary | Pass | Pass |
| TC04 | Timezone conversion | Pass | Pass |
| TC05 | Duplicate earning input | Pass | Pass |
| TC08 | Failed payment and retry | Pass | Pass |
| TC09 | Notification failure preserves payment | Pass | Pass |
| TC10 | Payroll retry cannot create another payment | Fail | Pass |
| TC13 | Partial persistence failure rolls back payment and message | Fail | Pass |

These eight are included in the full suite of 33 Playwright checks and one Node fresh-process check. The full suite covers additional boundaries and recovery paths. It runs against both builds.

CSV columns follow the supplied reference: TC ID, Test Scenario, Test Case, Test Steps, Test Data, Expected Result, Actual Result, Status, and Comment / Screenshot. Design tables have blank actual results and Not Run. Completed execution tables contain actual automated results. Case IDs link the design, automation and recorded result.

Follow SETUP.md, then run npm run verify from this directory. See the [execution comparison](executions/README.md) for the final outcome. Results do not imply candidate manual sign-off.
