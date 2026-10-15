# Payroll test suite

The standard test-management tables are in the QA project:

- [Eight core assessment cases](../test-cases/core-payroll-regression.csv).
- [Complete 34-check test suite](../test-cases/payroll-test-suite.csv).
- [QA strategy, coverage map and project organization](../README.md).

Both tables use TC ID, Test Scenario, Test Case, Test Steps, Test Data, Expected Result, Actual Result, Status, and Comment / Screenshot. Preconditions precede numbered steps. Design tables remain separate from executed results.

The eight core cases are TC01, TC03, TC04, TC05, TC08, TC09, TC10 and TC13. Every case is executed against both builds with identical preconditions, steps, inputs and expected results. They are not divided between the builds. Each completed sheet below contains all eight cases, with that build's actual results and evidence.

| Target | Eight-case results | Complete results | Playwright execution record |
|---|---|---|---|
| Buggy app | [Core results](../executions/buggy/core-results.csv) | [All 34](../executions/buggy/test-results.csv) | [Buggy execution](../executions/buggy/README.md) |
| Fixed app | [Core results](../executions/fixed/core-results.csv) | [All 34](../executions/fixed/test-results.csv) | [Fixed execution](../executions/fixed/README.md) |

Core results: buggy build, six passed and two failed (TC10 and TC13); fixed build, eight passed. Those two cases demonstrate failure before correction and success afterward. The other six cases check that the surrounding business rules continue to pass.

Each target executes 33 Playwright browser/API checks and one separate Node fresh-process check. The core eight belong to the Playwright suite. Source case IDs, inputs and positive expectations are shared. The records distinguish actual failures from expected outcomes; no case is skipped or changed to make the buggy app pass.

The full suite is a local reference check. It does not establish real-bank, distributed-worker, tax or production payroll readiness. See the [release decision](release-readiness.md).
