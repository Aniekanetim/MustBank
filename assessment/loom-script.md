# Loom recording script

Target 4 minutes 30 seconds, leaving 30 seconds for navigation. Rehearse and check the actual recording length; a script does not establish duration. Complete the personal review first. Replace the ownership placeholder with facts before recording. The final Loom URL is still pending.

Prepare fresh faulty and fixed workspace tabs, the generated business-proof page, PAY-001 and the completed verification log. Run tests before recording so the video can show the actual saved results without waiting for the suite.

## 0:00–0:35 — The rule and choice

“This is MustPayroll, a local payroll example using synthetic employees and a local payment ledger. I chose payroll to make the business consequence clear: one employee is owed the total approved earnings for one pay period, exactly once.

I prioritized duplicate pay during recovery over a cut-off error, a premature notification and duplicate earning imports. Recovery can create an incorrect payment even when the original payment succeeded. The frequency in production is unknown.”

Show the ₦150,000 approved amount and selected period.

## 0:35–1:40 — Reproduce the failure

“This employee has ₦150,000 of approved earnings. I am using a deliberately faulty implementation and a one-shot notification failure, prepared outside the product UI.

The first processing attempt records one payment, but notification remains pending. Now I retry the same pay run. Recorded pay becomes ₦300,000 although approved pay is still ₦150,000. The mismatch is visible and two distinct payment references exist for the same employee and period.

This is a controlled local defect, not a live incident or real financial loss.”

Process and retry the faulty example; show the mismatch and payment records.

## 1:40–2:20 — Explain the cause

“The faulty completion marker is written only after notification succeeds. When delivery fails, the payment exists but that marker does not. Retry therefore pays again.

The correction uses durable employee-period payment identity, with a unique database guard. Payment and pending notification work commit together. Sending the notification happens afterwards. Recovery checks the payment record and retries the existing message.”

Show the short causal explanation in PAY-001, rather than reading the whole source file.

## 2:20–3:15 — Verify the correction

“The corrected example uses the same earning inputs, amount and notification failure. After the first payment, I retry the original run. The result remains one ₦150,000 payment with the original reference. The existing message is recovered.

The same business assertion fails for the faulty version and passes for the correction. The recorded verification also covers aggregation, approvals, UTC boundaries, timezone conversion, duplicate input, partial failure, rollback and fresh-process recovery.”

Show corrected recovery, then the generated comparison and actual verification output.

## 3:15–4:00 — AI and personal ownership

“I directed the payroll framing, the use of Playwright and the requirement for clear, traceable deliverables. Codex assisted with implementation, test design, execution and drafting. GitHub Actions ran the verification independently.

[Replace this paragraph with the exact checks you personally performed, one conclusion you independently reached, and the evidence supporting it. Do not claim an AI mistake or personal test execution that did not occur.]”

## 4:00–4:30 — Decision and handoff

“The evidence supports local assessment review of this corrected flow. It does not establish live payroll readiness: real bank movement, taxes, authentication, distributed processing and real inbox delivery are outside scope.

The recovery guide distinguishes an unpaid employee from a paid employee with a missing notification. The directive links the runnable project, cases, defect, evidence and release checklist so a reviewer can reproduce the result.”

State your own final judgment after review, and show the directive's results appendix. Add the accessible Loom link before submission and verify that a reviewer can view it.
