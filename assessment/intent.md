# Why this problem

**The chosen failure is a second payout after a notification failure.** One task deserves 10 credits. The first settlement pays it, but the notification fails. An operator retries settlement to recover delivery, and a faulty completion rule pays the task again. The user now has 20 credits for work that should earn 10.

This is a useful QA problem because the first failure can look like a messaging issue while recovery creates a payment error. It lets the assessment show the full chain: identify the business consequence, reproduce the trigger, explain the rule, isolate the cause, and check that recovery preserves the correct balance.

## Alternatives considered

These possible failures were ranked before implementation. Likelihood describes plausible triggers rather than observed incident frequency. No live product data or production incident history was available.

| Rank | Possible failure | User/business impact | Likelihood or uncertainty | Relative effort |
|---|---|---|---|---|
| 1 | Notification failure followed by settlement replay creates a second payout | Incorrect balance and duplicate liability; recovery can amplify the error | Plausible when a worker or operator retries after partial failure; frequency unknown | Medium: preserve payment identity and test partial recovery |
| 2 | UTC cut-off or timezone conversion assigns a task to the wrong week | Missing, delayed or incorrectly timed rewards | Boundary inputs are predictable; affected volume unknown | Low: normalize instants and test both boundaries |
| 3 | Success notification is sent before payment succeeds | User believes a reward exists when no payment was recorded | Plausible if delivery and payment ordering are wrong; frequency unknown | Low to medium: enforce ordering and test payment failure |

The duplicate payout is the best candidate for deeper investigation: its impact reaches the ledger, and an otherwise reasonable retry causes it. Boundary and ordering failures remain in the regression scope because they help establish what a correct settlement means.

## Why this project

MustBank is a small, inspectable React application with fictional banking flows, adapted from an MIT-licensed sample. Its rewards module implements the Quest's rules explicitly. The project is small enough for a reviewer to run, inspect and reproduce the same failure.

The project uses a persistent local API so a reload or fresh process can verify that payment identity survives. Playwright exercises ordinary UI controls and HTTP requests. The intentionally faulty implementation and corrected reference sit behind separate examples, with the same core business assertion applied to both.

## What successful work will communicate

The reader should move from **why this failure matters**, to **what the rule requires**, to **what actually happened**, and finally to **why the fix is sufficient within the tested scope**. The final directive links each claim to the runnable project, results and evidence. AI-assisted implementation and checks are disclosed in the handoff; Aniekan's review and recorded walkthrough remain part of the final submission.
