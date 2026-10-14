# QA-001: settlement replay duplicates a paid reward

**Notification failure leaves a task eligible for payment again in the deliberately faulty assessment mode.** The first settlement commits 10 credits. Retrying the same settlement produces a second payout, taking the balance to 20 instead of 10.

## Environment and reproduction

Use this fork's assessment branch, Node 22.21.0, and Chromium as recorded in [summary.json](evidence/summary.json). The failure is in the new rewards module, not the original bank transfer implementation. Follow the [README setup](../README.md).

1. With the built local app running, run `npm run scenario -- --behavior faulty --fail-notification` in a second terminal. This creates an isolated rewards account and prepares the delivery failure outside the banking UI.
2. Open its printed **Operations URL**. Keep scheduled run `2026-10-13T09:00:00Z`. The single activity completed on 8 October is inside the window.
3. Click **Run settlement**. Payment succeeds; delivery fails. Observe 10 credits, one payout and one pending confirmation.
4. Click **Run settlement** again with the same scheduled time.

| Expected | Observed in faulty mode |
|---|---|
| One 10-credit payout; recover the existing notification | Two payouts totaling 20 credits; a new notification succeeds while the original failed message stays pending |

## Impact and severity

Severity is **high / P1** for the represented business rule: recovery changes the balance incorrectly and can create duplicate liability. The trigger is a partial failure followed by an ordinary retry. This blocks release of the faulty rewards behavior. There is no evidence of real financial loss, affected production users or incident frequency; all records here are simulated.

## Root cause

The faulty branch in [server/rewards.mjs](../server/rewards.mjs) uses `processed_tasks` to decide whether a task is already settled. The marker is written in `deliver()` only after notification success. Payment commits earlier, creating an inconsistent state: **payment exists, completion marker absent**. The retry consults the absent marker rather than the durable payout and creates a second record. Faulty mode intentionally omits the corrected payout uniqueness guard.

[First-attempt records](evidence/faulty-first-attempt.json) contain the payment and failed delivery. [Replay records](evidence/faulty-scenario.json) contain two payouts for the same task. The [screenshot](evidence/faulty-reproduction.png), [trace](evidence/faulty-trace.zip) and [TC10 report](evidence/faulty-playwright.json) show the UI and failed 10-credit assertion.

## Fix and verification

The corrected branch treats the payout as payment completion, protected by a unique `(scenario_id, task_id)` index. It saves the payout and pending notification work in one SQLite transaction. After commit, delivery can succeed or stay pending; neither path changes whether the task was paid. Replaying settlement skips existing payouts and dispatches pending messages. Notification-only retry also leaves the ledger untouched.

Prepare the corrected reference with `npm run scenario -- --behavior fixed --fail-notification`, open its Operations URL, and repeat the same two settlement actions. TC10 uses **the same controls and expected 10-credit result** in both modes. It fails against faulty behavior at 20 credits and passes against the corrected reference at 10. The [corrected snapshot](evidence/fixed-scenario.json) shows one payout and recovered delivery. TC08, TC11–TC13, TC17, TC18 and TC22 check successful replay, persistence, rollback, overlapping requests, acknowledgment loss and browser recovery.

## Release blockers

Block release if a repeated task adds a payout, notification failure changes an existing balance, payment failure produces a success message, or persisted payment loses recovery work. Require the corrected cases to pass and controlled TC10 failure to remain reproducible. `npm run verify` checks both; [CI](../.github/workflows/quest.yml) repeats it. Faulty behavior is retained in local fixture tooling and documented evidence. It has no customer-facing switch and must never become production payment behavior.
