# MustPayroll

MustPayroll models approved earnings, weekly pay runs and notification recovery using synthetic employees and a local payment ledger. The buggy and fixed applications are complete, separate projects. The QA project sits beside their container.

~~~text
MustBank/
  Mustpayroll_buggy/       Independent application with the controlled defect
  MustPayroll_fixed/      Independent application with the correction
MustPayroll_QA/
  test-cases/             Shared eight-case core and 34-check full suite
  tests/                  Shared Playwright and fresh-process checks
  scripts/                Test execution, fixtures and report generation
  executions/buggy/       Actual results and reports for the buggy application
  executions/fixed/       Actual results and reports for the fixed application
  assessment/             intent.md, directive.md, defect report and handoff
  supporting-media/       Optional historical screenshots and recordings
~~~

## Run either application

Requires Node.js 22.13 or later. Each application includes its own source, server, compiled interface, dependency lockfile, build tooling and database location. Starting it uses no external dependencies or files from its sibling or the QA project.

| Application | Start from this repository root | Address |
|---|---|---|
| [Buggy application](MustBank/Mustpayroll_buggy) | npm --prefix MustBank/Mustpayroll_buggy start | http://127.0.0.1:4175/overview |
| [Fixed application](MustBank/MustPayroll_fixed) | npm --prefix MustBank/MustPayroll_fixed start | http://127.0.0.1:4176/overview |

Each application can also be copied to another location and started there with npm start. No dependency installation is required to serve its compiled interface. Its own README explains independent rebuilding and development. Each writes only to its own data/payroll.sqlite by default.

## Review and reproduce the QA work

Start with the [QA guide](MustPayroll_QA/README.md), [setup instructions](MustPayroll_QA/SETUP.md) and [directive](MustPayroll_QA/assessment/directive.md).

| Target | Eight completed cases | Full execution |
|---|---|---|
| Buggy | [Core results](MustPayroll_QA/executions/buggy/core-results.csv) | [Run record and reports](MustPayroll_QA/executions/buggy/README.md) |
| Fixed | [Core results](MustPayroll_QA/executions/fixed/core-results.csv) | [Run record and reports](MustPayroll_QA/executions/fixed/README.md) |

The same eight core cases run against each application with unchanged inputs and expectations. The full shared suite contains 33 Playwright checks and one separate fresh-process check per application. Run the complete verification from MustPayroll_QA after following its setup instructions.

The required submission includes the candidate's Loom, intent.md and final directive.md, linking the runnable test project, cases/results, defect report and release checklist. Evidence is required by the brief; screenshots and browser automation recordings are optional formats. The [evidence requirement review](MustPayroll_QA/assessment/evidence-requirements.md) identifies the exact wording. The final candidate Loom and personal sign-off remain pending.

## Scope and provenance

No real funds, bank services, employee records or employer credentials are used. Taxes, statutory payroll compliance, authentication and distributed processing are outside the verified scope. Keep the unauthenticated servers on localhost.

This MIT-licensed fork retains the original sample's [license](LICENSE) and review history. The current payroll service, interface and controlled defect were introduced for this exercise; no discovered upstream incident or production loss is claimed. AI supported implementation, testing and writing; the candidate owns personal review and final release judgment.
