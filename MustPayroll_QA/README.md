# MustPayroll quality work

Quality assurance defines the process, risk priorities and acceptance conditions used to prevent defects. Quality control designs and executes product checks, records defects and verifies corrections. Both operate throughout development; QC findings provide evidence for the QA release gates.

## Project organization

| Area | Purpose | Existing work |
|---|---|---|
| Quality assurance | Establish risks, business acceptance criteria and release conditions | [Intent and priorities](quality-assurance/intent.md), [business rules and flow](quality-assurance/business-rules.md), [release-gate checklist](quality-assurance/release-readiness.md) |
| Quality control | Design and run checks, inspect outcomes and investigate product failures | [Cases](quality-control/test-cases), [automation](quality-control/tests), [execution scripts](quality-control/scripts), [buggy results](quality-control/executions/buggy/README.md), [fixed results](quality-control/executions/fixed/README.md), [defect report](quality-control/defect-report.md) |
| Submission and handoff | Connect the approach, findings, actual release judgment, gaps and ownership | [directive.md](directive.md) |
| Shared tooling | Install dependencies, locate/build/start the applications and prepare fixtures | [SETUP.md](SETUP.md), [application scripts](scripts), [configuration](config) |

The release checklist defines what must be true. The directive records whether the QC evidence meets those conditions and what remains unverified. Test-case definitions live under quality-control because they specify checks of the product against the QA acceptance rules.

## Follow the work

1. Read quality-assurance/intent.md for the selected risk and prioritization.
2. Review quality-assurance/business-rules.md and release-readiness.md for the expected behavior and release criteria.
3. Inspect the shared cases, both execution records and PAY-001 under quality-control.
4. Read directive.md for the resulting release decision, remaining gaps and handoff.

The same eight core cases and full 34-check suite execute against both independent applications with unchanged inputs, steps and expected results. Each execution has completed CSVs, a test record, raw Playwright results/log, a fresh-process result/log and relevant defect evidence. [Compare the executions](quality-control/executions/README.md).

The case tables retain the supplied nine-column format. Definitions have blank actual results and Not Run. Execution tables contain actual automated outcomes. The [core suite](quality-control/test-cases/core-payroll-regression.csv) contains eight cases; the [complete suite](quality-control/test-cases/payroll-test-suite.csv) contains 33 Playwright checks and one Node fresh-process check.

All npm commands run from MustPayroll_QA. Follow SETUP.md, then use npm run verify. Use npm run qc:design to refresh the case tables after a catalogue change. Test results are automated and do not imply candidate manual sign-off. The required Loom remains pending in directive.md.
