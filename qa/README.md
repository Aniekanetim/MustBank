# MustPayroll QA project

Start with the core suite, inspect the buggy execution, compare the fixed execution, then read the release decision. Definitions, automation and execution evidence have separate locations.

| Purpose | Location |
|---|---|
| Eight required assessment cases | [Core payroll regression](test-cases/core-payroll-regression.csv) |
| Complete test design, 34 checks | [Payroll test suite](test-cases/payroll-test-suite.csv) |
| Editable case definitions | [Case catalogue](test-cases/catalog.json) |
| Shared automation | [API checks](../tests/payroll-api.spec.ts), [UI checks](../tests/payroll-ui.spec.ts), [fresh-process check](../tests/service.test.mjs) |
| Buggy build execution | [Run record](executions/buggy/README.md), [core results](executions/buggy/core-results.csv), [all results](executions/buggy/test-results.csv) |
| Fixed build execution | [Run record](executions/fixed/README.md), [core results](executions/fixed/core-results.csv), [all results](executions/fixed/test-results.csv) |
| Before/after comparison | [Execution comparison](executions/README.md), [business proof](../assessment/evidence/business-proof.md) |
| Release decision and limits | [Release readiness](../assessment/release-readiness.md) |

## Core assessment coverage

| Case | Business risk covered |
|---|---|
| TC01 | Approved payroll aggregated once for each employee |
| TC03 | Closing UTC boundary deferred to the next period |
| TC04 | Lagos timestamps normalized before eligibility decisions |
| TC05 | Identical input cannot inflate earnings |
| TC08 | A failed payment cannot produce a notification |
| TC09 | A failed notification cannot reverse its successful payment |
| TC10 | Retrying after notification failure cannot pay again |
| TC13 | Interrupted payment/outbox persistence cannot leave an orphan |

These eight are a subset of the 34 checks. The full suite also covers opening cut-off, approvals, conflicting input, notification-only recovery, ambiguous acknowledgements, restart recovery, overlapping requests, locked periods and UI workflows.

## Standard suite tables

The CSV files follow the supplied nine-column format: TC ID, Test Scenario, Test Case, Test Steps, Test Data, Expected Result, Actual Result, Status, and Comment / Screenshot. Preconditions appear before the numbered steps. Case IDs remain identical in the definition, automation, execution table and defect evidence.

The design CSVs contain blank actual results and Not Run because they are definitions. Each execution folder contains a separate completed result table generated from the actual automated report. Failed assertions remain Fail in the buggy execution. The same positive business expectations are used in both runs. Results are automated and do not imply candidate manual execution.

## Execute and inspect

From the repository root, use npm ci, npx playwright install --no-shell chromium, then npm run verify. This rebuilds builds/buggy and builds/fixed and executes the shared suite against each. Each Playwright process starts exactly one selected build on the isolated test port 4184 with its own test database. TC34 checks the served build identity. The manually reviewable apps continue to use ports 4175 and 4176.

Each execution folder contains:

~~~text
README.md                 Run summary, environment, build identity and verdict
run.json                  Structured execution record and report fingerprints
core-results.csv          Eight core cases with actual results
test-results.csv         All 34 cases with actual results
playwright/
  report.json             Playwright machine-readable report
  console.log             Playwright console output
  html-report/            Interactive Playwright report
  artifacts/              Per-test traces, screenshots and videos
process/
  console.log             Separate Node fresh-process check
  observation.json        State before and after restart
evidence/                Build identity and selected regression evidence
~~~

Open either report with npx playwright show-report qa/executions/buggy/playwright/html-report or npx playwright show-report qa/executions/fixed/playwright/html-report.

HTML reports and bulk per-test artifacts are generated locally and preserved in CI artifacts. The versioned CSVs, run records, raw reports, logs and selected evidence give the reviewer a durable result. Comparative proof stays in assessment/evidence; run-specific files stay with their execution.

Edit catalog.json and run npm run qa:design to refresh the design tables. npm run verify validates that every defined case has an execution result and regenerates both completed result tables. It accepts the known faulty business failures and requires every fixed check to pass. A skipped case, timeout or unrelated failure blocks verification.
