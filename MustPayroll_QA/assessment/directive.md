# Prevent duplicate employee payment during payroll recovery

Application locations: [buggy folder](../../MustBank/Mustpayroll_buggy) and [fixed folder](../../MustBank/MustPayroll_fixed), with [independent run instructions](../application-builds.md). The full verification builds and tests these folders directly. Their runtime file hashes and served build IDs tie each result to its application.

## Objective

Demonstrate that recovering a notification failure cannot pay an employee twice for the same approved payroll period. The employee is owed ₦150,000. After the payment succeeds and its notification fails, retrying payroll must retain the original payment and recover delivery.

Start with the [two builds and two test records](../executions/README.md), then [intent.md](intent.md) for the choice, [the business rule and flow](business-rules.md) for the expectation, and [the generated before/after proof](evidence/business-proof.md) for the observed result. The remaining links support reproduction, release judgment and handoff.

## Scope

MustPayroll is a local application for a synthetic company, Northstar Studio. The journey covers employee destinations, approved earnings, weekly pay periods, pay-run confirmation, payment records, receipts and notification recovery. The application was adapted from an MIT-licensed sample; the current payroll service and controlled defect were introduced for this assessment.

The selected defect is PAY-001. Boundary handling, timezone conversion, duplicate imports, approval, partial failure and persistence are adjacent regression concerns. Taxes, statutory deductions, salaried proration, leave, employee or account changes, real funds, external banking, authentication and distributed processing are outside scope.

## Requirements

1. Identify at least three plausible failures, rank their impact, likelihood or uncertainty and effort, and explain why PAY-001 takes priority. See [intent.md](intent.md).
2. Define an equally concrete alternative to the suggested rewards flow. The [payroll rules](business-rules.md) establish eligibility, UTC boundaries, amounts, approval, immutable IDs, locked periods and account/admin assumptions.
3. Deliver two separately runnable payroll builds: one preserving the defect and one containing the correction. Execute the same full test suite against both. Keep a separate test record for each, tied to its exact build ID and runtime file hashes.
4. Document at least eight cases covering the happy path, cut-off, timezone, duplicates, retries and partial failure. Execute every core case against both builds with identical preconditions, steps, inputs and expected results. Record each build's actual results, status and evidence in its own completed eight-case sheet. The current [case register](test-cases.md) contains these eight core cases within a 34-check suite, which also runs against both builds.
5. Produce an actionable [defect and root-cause report](defect-report.md), release-blocking checks, final verification evidence, remaining gaps and a [release decision](release-readiness.md).
6. Provide accessible work links and a Loom of no more than five minutes. Aniekan must review and explain the final work; the reviewer assigns the assessment score.

## Completion criteria and current position

| Criterion | Result |
|---|---|
| Alternatives prioritized; payroll flow and business rule explicit | Complete in intent and business rules |
| Two independently runnable application builds | Each owns its source, dependency lockfile, build tooling, compiled interface, server and database; no application or QA dependency between them |
| Two executed test records | Complete; full 34-case suite against each application folder, with logs, build identity and observed state |
| Controlled defect fails the original business expectation | Observed: two payments totaling ₦300,000 instead of ₦150,000 |
| Corrected flow passes with payment identity preserved | Observed: one ₦150,000 payment and recovered notification |
| Same eight core cases executed against each build | Buggy: 6 passed, 2 failed (TC10 and TC13). Fixed: 8 passed, 0 failed. Inputs and expected results unchanged |
| Extended suite and final run | Buggy: 29 passed, 5 failed. Fixed: 34 passed, 0 failed. Same 33 Playwright checks plus one fresh-process check in each run |
| Defect report, release blockers, gaps and handoff | Complete for the local reference scope |
| Personal ownership review and final Loom | Application review reported in progress; specific checks/sign-off and final recording remain pending |
| Submission destination, exact deadline/timezone and full weighted rubric | Conditional form fields reported by candidate; exact submission field and invitation terms remain unconfirmed |

## Results and handoff appendix

The repository remains at its existing URL so its history and draft review remain available. The current product and evidence concern payroll; previous banking results do not establish payroll correctness.

| Work or evidence | Accessible link |
|---|---|
| Faulty application and execution record | [Buggy application folder](../../MustBank/Mustpayroll_buggy) · [faulty record](../executions/buggy/README.md) |
| Fixed application and execution record | [Fixed application folder](../../MustBank/MustPayroll_fixed) · [fixed record](../executions/fixed/README.md) |
| Standalone application verification | [Copied-folder execution check](evidence/independence.json) |
| Build comparison and exact correction | [Pair manifests and hashes](builds/pair.json) · [payment-policy patch](builds/fix.patch) |
| Runnable project and exact setup | [README](../../README.md) · [repository branch](https://github.com/Aniekanetim/MustBank/tree/quest/rewards-settlement) |
| Test project | [Playwright cases](../tests/payroll-api.spec.ts) · [UI regression](../tests/payroll-ui.spec.ts) · [fresh-process check](../tests/service.test.mjs) |
| Cases, inputs, expected outcomes and results | [Test register](test-cases.md) |
| Same eight core cases, separate completed results | [Buggy eight-case sheet](../executions/buggy/core-results.csv) · [fixed eight-case sheet](../executions/fixed/core-results.csv) |
| Business rule, flow and assumptions | [Payroll rules](business-rules.md) |
| Actionable defect, cause and proposed correction | [PAY-001](defect-report.md) |
| Environment, source SHA-256 fingerprints and results | [Verification summary](evidence/summary.json) |
| Readable business result and causal comparison | [Generated proof](evidence/business-proof.md) · [machine-readable comparison](evidence/business-proof.json) |
| First payment with failed notification | [Faulty first attempt](../executions/buggy/evidence/first-attempt.json) · [corrected first attempt](../executions/fixed/evidence/first-attempt.json) |
| State after retry | [Faulty workspace](../executions/buggy/evidence/workspace.json) · [corrected workspace](../executions/fixed/evidence/workspace.json) |
| Regression evidence | [Expected failure](../executions/buggy/playwright/console.log) · [corrected run](../executions/fixed/playwright/console.log) · [faulty fresh-process result](../executions/buggy/process/console.log) · [fixed fresh-process result](../executions/fixed/process/console.log) |
| Machine-readable reports | [Faulty report](../executions/buggy/playwright/report.json) · [corrected report](../executions/fixed/playwright/report.json) |
| Optional historical visual support | [Faulty payroll](../supporting-media/previous-run/buggy/reproduction.png) · [corrected payroll](../supporting-media/previous-run/fixed/reproduction.png) · [failure trace](../supporting-media/previous-run/buggy/PAY-001-trace.zip) |
| Release decision and remaining gaps | [Release readiness](release-readiness.md) |
| Operational recovery and support handoff | [Recovery runbook](operations-runbook.md) |
| AI delegation and candidate ownership | [Activity record](ai-accountability.md) · [guided personal review](personal-review.md) |
| Transcript expectations and payroll adaptation | [Expectation review](expectation-review.md) |
| Anonymous reviewer access | [Checked project/evidence links](evidence/reviewer-access.json) |
| Customer-facing workflow verification | [Interface review](ui-review.md) |
| Reviewable change | [Draft pull request](https://github.com/Aniekanetim/MustBank/pull/1) |
| Recording preparation | [Loom script](loom-script.md), targeting 4:30 with a 30-second buffer |
| Final Loom | Pending candidate recording; replace this entry with an accessible link before submission |

To verify independently, follow README, install Chromium, and run npm run verify. To inspect manually, start both applications and prepare a fresh example in each with npm run scenario. Use each printed workspace URL; do not reuse a previously processed workspace for a first-attempt demonstration. The fixture and ledger stay local. No confidential employer information or real employee data is included.

AI assistance through Codex supported implementation, test design, execution and drafting. Automated results are identified as such. Aniekan's personal review and recorded explanation are not represented as completed. This fictional Quest case does not replace any separately requested genuine portfolio cases. The 76/100 threshold is the employer's pass requirement, not a self-assigned result.

Screenshots and automation recordings are optional supporting formats. The [source review](evidence-requirements.md) distinguishes those formats from the required defect and verification evidence. Current results come from the two execution records; older media retains its original build identity.

## Final submission checks

- Complete the personal review record with actual actions and a bounded release judgment.
- Record and check the Loom's actual duration, replace the pending link above and verify reviewer access to it.
- Use the assessment's appropriate repository/link/upload field when the conditional form exposes it. The saved initial form shows a PDF CV input and CV-text area; that stage does not establish the final Quest submission field. Do not infer the upload destination from it.
- Confirm the deadline/timezone, any compensation terms and any additional role-specific brief or rubric shown by the invitation/form. No follow-up message is assumed necessary if those details are supplied there.
- Provide two to four genuine past cases separately if the broader application requests them. This synthetic exercise cannot establish those incidents or their results.

The supplied transcript is the working source of truth, with the project adapted to payroll. The public repository provides the two runnable builds, two test records and supporting work and linked evidence. A live hosted payroll service is not required by the supplied brief, and this unauthenticated local application should not be deployed as a public financial service merely to make it clickable.
