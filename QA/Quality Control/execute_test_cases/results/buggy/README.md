# Buggy build test execution

**29 passed, 5 failed, 34 executed.**

| Scope | Total | Passed | Failed |
|---|---|---|---|
| Playwright browser/API | 33 | 29 | 4 |
| Node fresh-process check | 1 | 0 | 1 |
| Eight core cases, included above | 8 | 6 | 2 |

## Cases and actual results

- [Eight completed core cases](core-results.csv).
- [All 34 completed cases](test-results.csv).
- [Shared case definitions](../../../test_cases/payroll-test-suite.csv).

## Execution environment

Application: [buggy build](../../../../../MustBank/Mustpayroll_buggy). Build version: mustpayroll-0.2.0-faulty-c0f059dc3f59. Executed: 2026-10-16T05:05:08.060Z. Node v22.21.0, Chromium 156.0.8078.4, win32/x64. The isolated test URL was http://127.0.0.1:4184. The normal application port is 4175.

## Execution evidence

- [Playwright results](playwright/report.json) and [execution log](playwright/console.log).
- [Fresh-process execution log](process/console.log) and [before/restart result](process/observation.json).
- [First payment attempt](evidence/first-attempt.json) and [state after retry](evidence/workspace.json).
- Related failure checks: [TC13](evidence/TC13.json), [TC14](evidence/TC14.json), [TC16](evidence/TC16.json).
- [Served application version](evidence/served-build.json) and [structured test record](run.json).

The employee is owed NGN150,000. After notification failure and payroll retry, this build records NGN300,000.00 across 2 payment(s), with 1 pending notification(s). The expectation is unchanged between builds.

From QA/Quality Control/execute_test_cases, npm run verify rebuilds the apps and repeats the same suite against both. Results are automated; they do not claim candidate manual sign-off. See [execution comparison](../README.md), [defect report](../../../bug_report/PAY-001.md) and [release checklist](../../../../Quality%20assurance/release_readiness.md).
