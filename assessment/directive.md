# Final directive: prevent a duplicate reward on recovery

## Objective

Prove that a notification failure cannot cause a second payout when the same weekly settlement is retried. A qualifying task must leave the user with **10 credits and one payment record**, with notification recovery handled separately.

## Scope

MustBank is a fictional banking assessment adapted from an MIT-licensed sample. It includes a browser UI, a Node/SQLite API, a deliberately faulty rewards example, a corrected reference, and automated regression checks. Each rewards example is an isolated program. All records, credits and notification responses are synthetic.

The selected defect was introduced for reproducibility. It is not a report of a MUST product failure or an upstream incident. Live banking, real notification delivery, Web3 integrations and production deployment are outside this assessment.

The customer app presents account overview, transfers, recipients, activity and personal rewards. Operations handles settlement and notification recovery at `/operations/settlements`. Fixture creation and failure injection stay in local tooling. The customer reward projection uses fixture customer `user-001`; separating the screens does not establish production authentication or authorization.

## Requirements

1. Settlement is identified by its **Tuesday 09:00 UTC scheduled run**, including on retries.
2. For the 13 October 2026 run, qualifying completions fall in **5 October 00:00 UTC inclusive to 12 October 00:00 UTC exclusive**. Other weeks follow the same rule.
3. Only completed tasks qualify. Every unique task ID earns **10 credits once per isolated program**, even across repeated inputs and runs.
4. A notification may be attempted only after a payout commits. Notification failure cannot remove that payout or make the task eligible for payment again.
5. The corrected reference saves payment identity and pending notification work together. Retrying settlement or notification delivery recovers messages without adding payments.
6. Inputs use explicit UTC offsets and immutable task ownership, status and completion time. Conflicting records are rejected; reward amount and schedule are fixed.

The [business rules and flow](business-rules.md) explain assumptions and sequence. The [intent](intent.md) ranks alternatives and explains the choice.

## Completion criteria

| Criterion | Verification artifact |
|---|---|
| A reviewer can reproduce the selected failure | [Run instructions](../README.md) and [defect report](defect-report.md) |
| The same assertion fails against faulty behavior and passes after correction | TC10 reports, first-attempt records and final snapshots below |
| At least eight cases cover happy path, boundaries, timezone, duplicate input, retry and partial failure | [46 cases and results](test-cases.md) |
| Payment identity survives a fresh process | TC11 and [process recovery log](evidence/process-recovery.log) |
| Root cause, fix, release blockers and remaining gaps are actionable | [Defect report](defect-report.md) and [release checklist](release-readiness.md) |
| Required submission artifacts are accessible | This directive, [intent.md](intent.md), project/evidence links, and the candidate's Loom link |

## Results and handoff appendix

The final local run **passed all 46 corrected checks**: 45 Playwright cases plus one fresh-process check. [summary.json](evidence/summary.json) records runtime versions and source hashes. Faulty replay produces **20 credits, two payouts and one pending notification**. Corrected replay keeps **10 credits and one payout**, with **zero pending notifications** after recovery. The unchanged TC10 assertion fails against the faulty example and passes against the correction.

| Deliverable | Accessible work and evidence |
|---|---|
| Runnable project | [Fork assessment branch](https://github.com/Aniekanetim/MustBank/tree/quest/rewards-settlement) · [setup and reproduction](../README.md) |
| Cases and results | [Test cases](test-cases.md) · [corrected Playwright report](evidence/fixed-playwright.json) · [process check](evidence/process-recovery.log) |
| Failing regression | [Faulty report](evidence/faulty-playwright.json) · [first payment](evidence/faulty-first-attempt.json) · [after replay](evidence/faulty-scenario.json) · [screenshot](evidence/faulty-reproduction.png) · [trace](evidence/faulty-trace.zip) |
| Passing regression | [First payment](evidence/fixed-first-attempt.json) · [after replay](evidence/fixed-scenario.json) · [screenshot](evidence/fixed-reproduction.png) |
| Defect and root cause | [QA-001 defect report](defect-report.md) |
| Release readiness | [Decision, checklist and gaps](release-readiness.md) |
| Banking workspace | [UI review and audit corrections](ui-review.md) · [overview](evidence/customer-overview.png) · [rewards](evidence/customer-rewards.png) · [transfer receipt](evidence/transfer-receipt.png) · [mobile](evidence/customer-mobile.png). TC25–TC46 cover review, explicit destination choice, preserved drafts, durable local receipts, recipient lifecycle, money direction, reward timing, keyboard paths and exports. |
| CI | [GitHub Actions runs](https://github.com/Aniekanetim/MustBank/actions) · the workflow repeats the complete evidence check |
| Loom, maximum five minutes | **Pending candidate recording.** Use the [walkthrough outline](loom-outline.md); insert the accessible Loom URL here before submission. |

To take over, run `npm ci`, install Chromium as described in the README, and run `npm run verify`. Read QA-001 alongside the two TC10 snapshots. For an interactive review, start the built app, prepare each rewards account using the README's `npm run scenario` commands, and open its Operations URL. Repeat settlement twice in each account, then inspect its Customer URL. A new account preserves earlier records separately.

Codex assisted with implementation, test execution and this draft documentation. The recorded runs are tool-executed evidence, not a claim that Aniekan personally ran them. Before submitting, Aniekan must review the requirements and evidence, make his own release judgement and record the Loom walkthrough. Submission destination, deadline/timezone, compensation terms and the full weighted rubric still require recruiter confirmation. The brief says **76/100 passes**; the reviewer assigns that score. The separate portfolio request for 2–4 genuine work cases also remains outside this fictional Quest package.
