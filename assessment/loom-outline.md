# Loom walkthrough — no more than five minutes

Prepare two fresh local workspaces before recording, using the faulty and fixed scenario commands in README with --fail-notification. Keep their URLs in separate tabs. Do not show setup switches as normal payroll features. Review the evidence personally before explaining it.

| Time | Idea to communicate | Show |
|---|---|---|
| 0:00–0:40 | One employee is owed ₦150,000 for approved earnings in one period. Recovery must not change that amount. Explain why duplicate pay outranks the other plausible failures. | intent.md and employee breakdown |
| 0:40–1:40 | Payment succeeds, notification fails, operator retries, and faulty completion logic pays again. This is a deliberately introduced local defect. | Faulty pay run: process, observe pending notification, retry, show ₦300,000 and two receipts |
| 1:40–2:30 | The payment is already complete; delivery is separate. Durable employee-period identity and atomic message work prevent repayment. | PAY-001 root cause and short corrected-flow explanation |
| 2:30–3:30 | Apply the same earning, failure and retry to the correction. One payment remains ₦150,000; notification recovers. | Corrected pay run, payment reference and notification status |
| 3:30–4:20 | The original business assertion fails for the faulty version and passes for the corrected version. Briefly identify boundary, timezone, duplicates, rollback and restart coverage. | Actual faulty-run.log, fixed-run.log and summary.json; distinguish 32 browser/API checks plus one process check |
| 4:20–5:00 | State the bounded release decision, remaining gaps, AI assistance and personal ownership. Explain how a reviewer can reproduce it. | Release readiness and directive results/handoff appendix |

Use the sequence: **rule → failure → cause → prevention → evidence → decision**. Say what you personally checked and what the automated tools checked. Do not claim a real incident, real bank payment, production readiness or a reviewer-assigned score. Add the final accessible Loom link to directive.md before submitting.
