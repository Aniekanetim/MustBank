# Candidate review before recording

**Status: application review in progress, as reported by Aniekan.** No specific defect reproduction, code or document review, or final sign-off has been confirmed. This guide records the next checks; its unchecked items are not a completed sign-off. Automated results are already linked in the directive.

Start both applications using README. Prepare a fresh workspace in each build:

~~~sh
npm run scenario -- --build faulty --fail-notification
npm run scenario -- --build fixed --fail-notification
~~~

Keep the printed URLs in separate tabs. In each, review the employee amount, process once and retry the same pay run. Use the [defect report](defect-report.md) for the exact sequence.

| Review step | What to record in your own words | Status |
|---|---|---|
| Explain the business rule | Who is owed what, for which period, and why a notification is separate | Unconfirmed |
| Reproduce the faulty retry | First payment reference, first notification state, amount/count after retry | Unconfirmed |
| Reproduce corrected recovery | Original reference before/after retry and recovered message state | Unconfirmed |
| Check the UTC boundary | Explain why an earning at 12 October 00:00Z belongs to the 20 October run; compare TC03/TC04 | Unconfirmed |
| Inspect root cause and regression | Explain the faulty completion marker, corrected payment identity and what TC10 asserts | Unconfirmed |
| Review evidence provenance | Check the assessed source fingerprints, actual run results and current CI checks | Unconfirmed |
| Make a release judgment | Accept, narrow or reject the local-review recommendation and explain remaining gaps | Unconfirmed |

Personal record to complete:

- Reviewed version or source fingerprints:
- Date of review:
- Steps actually performed and evidence inspected:
- One assumption challenged, confirmed or changed, with the reason:
- What AI produced and what you independently verified:
- Final judgment and limits:

There is no requirement to invent a correction to look active. An independently reasoned confirmation is valid when it identifies the rule, the evidence and its limits. Use only completed, accurate actions in the final Loom and ownership statement.
