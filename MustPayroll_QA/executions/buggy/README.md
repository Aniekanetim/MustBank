# Buggy build execution

**29 passed, 5 failed, 34 executed. BLOCK RELEASE: retry records another employee payment; persistence interruption also leaves an orphan payment.**

| Execution scope | Total | Passed | Failed |
|---|---|---|---|
| Playwright browser/API | 33 | 29 | 4 |
| Node fresh-process recovery | 1 | 0 | 1 |
| Eight core assessment cases (subset) | 8 | 6 | 2 |

## Suite tables

- [Eight core cases with actual results](core-results.csv).
- [All 34 cases with steps, data, expectations, actual results and status](test-results.csv).
- [Shared test design](../../test-cases/payroll-test-suite.csv), [core design](../../test-cases/core-payroll-regression.csv).

## Exact build and environment

Build: mustpayroll-0.2.0-faulty-c0f059dc3f59. Application folder: [../MustBank/Mustpayroll_buggy](../../../MustBank/Mustpayroll_buggy). Execution time: 2026-10-15T19:00:29.705Z. Runtime: v22.21.0, Chromium 156.0.8078.4, win32/x64.

The isolated automated server used http://127.0.0.1:4184. The manual app's default port is 4175. The [served-build evidence](evidence/served-build.json) matches this build ID and source fingerprint; TC34 verifies the opposite implementation is rejected. Application runtime SHA-256: ecae6720563a3a6f215fa4af9f33838eb6871f9109260acc485bd10a81db4fd9. Shared test-suite SHA-256: 05df1d1121ea945ba8898ec6018d0bb6fbeadbd12efd83368ea78d5d5cf74db0. Case-design SHA-256: d3945f44bf8504b51a1ca110bf2270b4df46a3610ac1e79af7f3ee815d964ed0.

## Open the Playwright execution

From MustPayroll_QA:

~~~sh
npx playwright show-report executions/buggy/playwright/html-report
~~~

- [HTML report](playwright/html-report/index.html), [raw JSON report](playwright/report.json), [console log](playwright/console.log).
- [Per-test runner artifacts](playwright/artifacts). Extra screenshots and browser recordings are optional; enable QA_CAPTURE_MEDIA=1 to collect them.
- [First attempt](evidence/first-attempt.json), [after retry](evidence/workspace.json).
- Related states: [TC13 interruption](evidence/TC13.json), [TC14 lost acknowledgement](evidence/TC14.json), [TC16 overlapping requests](evidence/TC16.json).
- The separate Node check has its own [console log](process/console.log) and [before/restart state](process/observation.json).

HTML reports and bulk per-test artifacts are generated locally and retained in CI artifacts. CSV results, raw JSON, logs and the selected regression evidence are committed with this record. The CI artifact contains the same execution-folder structure.

## Business outcome and handoff

One approved earning owes Amara NGN150,000. After a one-shot notification failure and a retry, this build records NGN300,000.00 across 2 payment(s), with 1 pending notification(s). The expectation remains one original payment and recovered delivery in both executions.

Run npm run verify to rebuild both folders and execute the same suite against each. No skips, timeouts or retries are accepted as business-defect proof. See [comparison](../README.md), [PAY-001](../../assessment/defect-report.md) and [release decision](../../assessment/release-readiness.md). Results are automated, not a claim of candidate manual sign-off. All employees, payment records and provider responses are synthetic.
