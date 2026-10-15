# Prevent duplicate employee payment during payroll recovery

## Objective

Demonstrate that recovering a notification failure cannot pay an employee twice for the same approved payroll period. The employee is owed ₦150,000. After the payment succeeds and its notification fails, retrying payroll must retain the original payment and recover delivery.

Start with the [two builds and two test records](test-records/README.md), then [intent.md](intent.md) for the choice, [the business rule and flow](business-rules.md) for the expectation, and [the generated before/after proof](evidence/business-proof.md) for the observed result. The remaining links support reproduction, release judgment and handoff.

## Scope

MustPayroll is a local application for a synthetic company, Northstar Studio. The journey covers employee destinations, approved earnings, weekly pay periods, pay-run confirmation, payment records, receipts and notification recovery. The application was adapted from an MIT-licensed sample; the current payroll service and controlled defect were introduced for this assessment.

The selected defect is PAY-001. Boundary handling, timezone conversion, duplicate imports, approval, partial failure and persistence are adjacent regression concerns. Taxes, statutory deductions, salaried proration, leave, employee or account changes, real funds, external banking, authentication and distributed processing are outside scope.

## Requirements

1. Identify at least three plausible failures, rank their impact, likelihood or uncertainty and effort, and explain why PAY-001 takes priority. See [intent.md](intent.md).
2. Define an equally concrete alternative to the suggested rewards flow. The [payroll rules](business-rules.md) establish eligibility, UTC boundaries, amounts, approval, immutable IDs, locked periods and account/admin assumptions.
3. Deliver two separately runnable payroll builds: one preserving the defect and one containing the correction. Execute the same full test suite against both. Keep a separate test record for each, tied to its exact build ID and package hash.
4. Record at least eight cases with inputs, expected outcomes and results, including the happy path, cut-off, timezone, duplicates, retries and partial failure. The current [case register](test-cases.md) contains 34 checks.
5. Produce an actionable [defect and root-cause report](defect-report.md), release-blocking checks, final verification evidence, remaining gaps and a [release decision](release-readiness.md).
6. Provide accessible work links and a Loom of no more than five minutes. Aniekan must review and explain the final work; the reviewer assigns the assessment score.

## Completion criteria and current position

| Criterion | Result |
|---|---|
| Alternatives prioritized; payroll flow and business rule explicit | Complete in intent and business rules |
| Two independently runnable application builds | Complete; faulty and fixed ZIP packages each contain one implementation |
| Two executed test records | Complete; full 34-case suite against each package, with logs, state evidence and separate TC10 videos |
| Controlled defect fails the original business expectation | Observed: two payments totaling ₦300,000 instead of ₦150,000 |
| Corrected flow passes with payment identity preserved | Observed: one ₦150,000 payment and recovered notification |
| Required cases and final run | Faulty: 29 passed, 5 failed. Fixed: 34 passed, 0 failed. Same 33 Playwright checks plus one fresh-process check in each run |
| Defect report, release blockers, gaps and handoff | Complete for the local reference scope |
| Personal ownership review and final Loom | Application review reported in progress; specific checks/sign-off and final recording remain pending |
| Submission destination, exact deadline/timezone and full weighted rubric | Conditional form fields reported by candidate; exact submission field and invitation terms remain unconfirmed |

## Results and handoff appendix

The repository remains at its existing URL so its history and draft review remain available. The current product and evidence concern payroll; previous banking results do not establish payroll correctness.

| Work or evidence | Accessible link |
|---|---|
| Faulty application and execution record | [Download faulty build](builds/MustPayroll-faulty.zip) · [faulty record](test-records/faulty.md) · [video](test-records/faulty-TC10.webm) |
| Fixed application and execution record | [Download fixed build](builds/MustPayroll-fixed.zip) · [fixed record](test-records/fixed.md) · [video](test-records/fixed-TC10.webm) |
| Build comparison and exact correction | [Pair manifests and hashes](builds/pair.json) · [payment-policy patch](builds/fix.patch) |
| Runnable project and exact setup | [README](../README.md) · [repository branch](https://github.com/Aniekanetim/MustBank/tree/quest/rewards-settlement) |
| Test project | [Playwright cases](../tests/payroll-api.spec.ts) · [UI regression](../tests/payroll-ui.spec.ts) · [fresh-process check](../tests/service.test.mjs) |
| Cases, inputs, expected outcomes and results | [Test register](test-cases.md) |
| Business rule, flow and assumptions | [Payroll rules](business-rules.md) |
| Actionable defect, cause and proposed correction | [PAY-001](defect-report.md) |
| Environment, source SHA-256 fingerprints and results | [Verification summary](evidence/summary.json) |
| Readable business result and causal comparison | [Generated proof](evidence/business-proof.md) · [machine-readable comparison](evidence/business-proof.json) |
| First payment with failed notification | [Faulty first attempt](evidence/faulty-first-attempt.json) · [corrected first attempt](evidence/fixed-first-attempt.json) |
| State after retry | [Faulty workspace](evidence/faulty-workspace.json) · [corrected workspace](evidence/fixed-workspace.json) |
| Regression evidence | [Expected failure](evidence/faulty-run.log) · [corrected run](evidence/fixed-run.log) · [fresh-process result](evidence/process-recovery.log) |
| Machine-readable reports | [Faulty report](evidence/faulty-playwright.json) · [corrected report](evidence/fixed-playwright.json) |
| Visual proof and trace | [Faulty payroll](evidence/faulty-reproduction.png) · [corrected payroll](evidence/fixed-reproduction.png) · [failure trace](evidence/faulty-trace.zip) |
| Release decision and remaining gaps | [Release readiness](release-readiness.md) |
| Operational recovery and support handoff | [Recovery runbook](operations-runbook.md) |
| AI delegation and candidate ownership | [Activity record](ai-accountability.md) · [guided personal review](personal-review.md) |
| Transcript expectations and payroll adaptation | [Expectation review](expectation-review.md) |
| Anonymous reviewer access | [Checked project/evidence links](evidence/reviewer-access.json) |
| Customer-facing workflow verification | [Interface review](ui-review.md) |
| Reviewable change | [Draft pull request](https://github.com/Aniekanetim/MustBank/pull/1) |
| Recording preparation | [Loom script](loom-script.md), targeting 4:30 with a 30-second buffer |
| Final Loom | Pending candidate recording; replace this entry with an accessible link before submission |

To verify independently, follow README, install Chromium, and run npm run verify. To inspect manually, start both packaged applications and prepare a fresh example in each with npm run scenario. Use each printed workspace URL; do not reuse a previously processed workspace for a first-attempt demonstration. The fixture and ledger stay local. No confidential employer information or real employee data is included.

AI assistance through Codex supported implementation, test design, execution and drafting. Automated results are identified as such. Aniekan's personal review and recorded explanation are not represented as completed. This fictional Quest case does not replace any separately requested genuine portfolio cases. The 76/100 threshold is the employer's pass requirement, not a self-assigned result.

## Final submission checks

- Complete the personal review record with actual actions and a bounded release judgment.
- Record and check the Loom's actual duration, replace the pending link above and verify reviewer access to it.
- Use the assessment's appropriate repository/link/upload field when the conditional form exposes it. The saved initial form shows a PDF CV input and CV-text area; that stage does not establish the final Quest submission field. Do not infer the upload destination from it.
- Confirm the deadline/timezone, any compensation terms and any additional role-specific brief or rubric shown by the invitation/form. No follow-up message is assumed necessary if those details are supplied there.
- Provide two to four genuine past cases separately if the broader application requests them. This synthetic exercise cannot establish those incidents or their results.

The supplied transcript is the working source of truth, with the project adapted to payroll. The public repository provides the two runnable builds, two test records and supporting work and linked evidence. A live hosted payroll service is not required by the supplied brief, and this unauthenticated local application should not be deployed as a public financial service merely to make it clickable.
