# Payroll execution comparison

The same suite, case IDs and positive business expectations run against two independent application folders.

| Build | Execution folder | Eight-case result sheet | Full result sheet | Total outcome |
|---|---|---|---|---|
| [buggy app](../../builds/buggy) | [buggy execution](buggy/README.md) | [Core eight](buggy/core-results.csv) | [All 34](buggy/test-results.csv) | 29 pass / 5 fail |
| [fixed app](../../builds/fixed) | [fixed execution](fixed/README.md) | [Core eight](fixed/core-results.csv) | [All 34](fixed/test-results.csv) | 34 pass / 0 fail |

Each execution contains its Playwright HTML/JSON reports, console log, per-test artifacts, curated evidence, a separate Node fresh-process result, build identity and standard result tables. The eight-case subset is included in the 34 checks. Read [QA project organization](../README.md) and [business proof](../../assessment/evidence/business-proof.md).
