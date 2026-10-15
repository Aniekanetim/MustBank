# MustPayroll

MustPayroll models approved earnings, weekly pay runs and notification recovery using synthetic employees and a local payment ledger. The buggy and fixed applications are independent projects; quality assurance and quality control sit outside their container.

| Location | Purpose |
|---|---|
| [MustBank/Mustpayroll_buggy](MustBank/Mustpayroll_buggy) | Complete application preserving the controlled defect |
| [MustBank/MustPayroll_fixed](MustBank/MustPayroll_fixed) | Complete application containing the correction |
| [MustPayroll_QA](MustPayroll_QA/README.md) | Separate quality-assurance and quality-control work, connected by directive.md |

## Run either application

Requires Node.js 22.13 or later. Each application has its own source, server, payment implementation, compiled interface, build commands and database. It can start, rebuild or be copied without its sibling or the QA project.

| Application | Start from this repository root | Local URL |
|---|---|---|
| Buggy | npm --prefix MustBank/Mustpayroll_buggy start | http://127.0.0.1:4175/overview |
| Fixed | npm --prefix MustBank/MustPayroll_fixed start | http://127.0.0.1:4176/overview |

Starting uses the committed compiled interface and Node built-ins. To rebuild an application, run npm ci and npm run build inside its folder. Each keeps its own data/payroll.sqlite.

## Assessment work

Start with [intent.md](MustPayroll_QA/quality-assurance/intent.md) and [directive.md](MustPayroll_QA/directive.md). The directive links the business rules and flow, runnable test project, cases/results, defect report, release checklist, verification evidence and handoff.

| Build | Eight completed cases | Execution record |
|---|---|---|
| Buggy | [Core results](MustPayroll_QA/quality-control/executions/buggy/core-results.csv) | [Results and logs](MustPayroll_QA/quality-control/executions/buggy/README.md) |
| Fixed | [Core results](MustPayroll_QA/quality-control/executions/fixed/core-results.csv) | [Results and logs](MustPayroll_QA/quality-control/executions/fixed/README.md) |

The same eight core cases and full 34-check suite run against both builds. Follow [SETUP.md](MustPayroll_QA/SETUP.md) to prepare the fixture and execute the tests. The required candidate Loom is still pending in directive.md.

## Scope and provenance

No real funds, bank services, employee records or employer credentials are used. Taxes, statutory compliance, authentication and distributed processing are outside the verified scope. Keep the unauthenticated servers on localhost.

This MIT-licensed fork retains the original sample's [license](LICENSE) and review history. The payroll service, interface and controlled defect were introduced for this exercise. No discovered upstream incident or production loss is claimed. AI supported implementation, testing and writing; the candidate owns personal review and final judgment.
