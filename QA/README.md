# MustPayroll quality work

Quality assurance defines the process, risk priorities and acceptance conditions used to prevent defects. Quality control designs and executes product checks, records defects and verifies corrections. Both operate throughout development; QC findings provide evidence for the QA release gates.

## Project organization

```text
QA/
├── Quality assurance/
│   ├── business_rules/
│   │   └── README.md
│   ├── intent/
│   │   └── intent.md
│   └── release_readiness/
│       └── README.md
├── Quality Control/
│   ├── test_cases/
│   ├── execute_test_cases/
│   │   ├── test/
│   │   │   ├── pages/              # Playwright page objects
│   │   │   ├── specs/              # UI and API cases for both builds
│   │   │   ├── helpers.ts
│   │   │   └── service.test.mjs    # Fresh-process recovery check
│   │   ├── results/
│   │   │   ├── buggy/
│   │   │   └── fixed/
│   │   ├── scripts/                # Execution and result generation
│   │   └── playwright.config.ts
│   └── bug_report/
│       └── PAY-001.md
├── directive.md
├── README.md
├── SETUP.md
├── package.json / package-lock.json / tsconfig.json
├── scripts/                        # Shared application build/start tooling
└── config/                         # Paired build identities
```

| Area | Purpose | Existing work |
|---|---|---|
| Quality assurance | Establish risks, business acceptance criteria and release conditions | [Intent and priorities](Quality%20assurance/intent/intent.md), [business rules and flow](Quality%20assurance/business_rules/README.md), [release-gate checklist](Quality%20assurance/release_readiness/README.md) |
| Quality control | Design and run checks, inspect outcomes and investigate product failures | [Cases](Quality%20Control/test_cases), [automation](Quality%20Control/execute_test_cases/test), [execution scripts](Quality%20Control/execute_test_cases/scripts), [buggy results](Quality%20Control/execute_test_cases/results/buggy/README.md), [fixed results](Quality%20Control/execute_test_cases/results/fixed/README.md), [defect report](Quality%20Control/bug_report/PAY-001.md) |
| Submission and handoff | Connect the approach, findings, actual release judgment, gaps and ownership | [directive.md](directive.md) |
| Shared tooling | Install dependencies, locate/build/start the applications and prepare fixtures | [SETUP.md](SETUP.md), [application scripts](scripts), [configuration](config) |

The release checklist defines what must be true. The directive records whether the QC evidence meets those conditions and what remains unverified. Test-case definitions live under Quality Control because they specify checks of the product against the QA acceptance rules.

## Follow the work

1. Read [intent.md](Quality%20assurance/intent/intent.md) for the selected risk and prioritization.
2. Review the [business rules](Quality%20assurance/business_rules/README.md) and [release criteria](Quality%20assurance/release_readiness/README.md) for expected behavior.
3. Inspect the shared cases, both execution records and PAY-001 under Quality Control.
4. Read [directive.md](directive.md) for the resulting release decision, remaining gaps and handoff.

The same eight core cases and full 34-check suite execute against both independent applications with unchanged inputs, steps and expected results. Each execution has completed CSVs, a test record, raw Playwright results/log, a fresh-process result/log and relevant defect evidence. [Compare the executions](Quality%20Control/execute_test_cases/results/README.md).

The case tables retain the supplied nine-column format. Definitions have blank actual results and Not Run. Execution tables contain actual automated outcomes. The [core suite](Quality%20Control/test_cases/core-payroll-regression.csv) contains eight cases; the [complete suite](Quality%20Control/test_cases/payroll-test-suite.csv) contains 33 Playwright checks and one Node fresh-process check.

The browser cases use the Page Object Model. [Page objects](Quality%20Control/execute_test_cases/test/pages) own screen locators and user actions. [Specs](Quality%20Control/execute_test_cases/test/specs) own scenarios and assertions. API checks and the fresh-process check remain separate from the UI page objects. The same automation runs against both applications, with separate results under execute_test_cases/results.

All npm commands run from QA. Follow SETUP.md, then use npm run verify. Use npm run qc:design to refresh the case tables after a catalogue change. Test results are automated and do not imply candidate manual sign-off. The required Loom remains pending in directive.md.
