# MustPayroll

MustPayroll is a focused payroll application for reviewing approved earnings, processing weekly pay runs and recovering payment notifications. The application uses synthetic employees and a local payment ledger. It connects to no bank, payroll provider or live financial system.

The QA investigation follows one failure: **a payment succeeds, its notification fails, and retrying payroll pays the employee again.** The same business assertion fails against deliberately faulty behavior and passes against the corrected implementation.

## Run locally

Use Node.js 22.13 or later and npm.

~~~sh
npm ci
npm run build
npm start
~~~

Open http://127.0.0.1:4174/overview. A new browser creates a workspace with three employees and ₦435,000 of approved earnings for the 13 October 2026 pay date. An additional pending earning belongs to the following period. The database is stored separately from the earlier banking prototype, in data/payroll.sqlite.

For development, use npm run dev. Vite serves the interface on port 5173 and proxies the API to port 4174. PAYROLL_DB, PORT, HOST and PAYROLL_API_PORT can override local defaults. Keep this unauthenticated application bound to localhost.

## Follow the payroll journey

1. Review the employee directory and masked payment destinations.
2. Record earnings with an employee, earning date, NGN amount and approval status. Approve pending records before processing their period.
3. Open Pay runs. Review the selected period, approved total and employee breakdown, then confirm processing.
4. Inspect payment records and open a receipt. Export payments or download a receipt for handoff.
5. If notification delivery is pending, recover it from Notifications. Successful payments remain recorded.

The UI uses normal payroll language. Fault injection and implementation selection remain in local setup tooling.

## Reproduce the selected defect

With the server running, prepare two isolated examples:

~~~sh
npm run scenario -- --behavior faulty --fail-notification
npm run scenario -- --behavior fixed --fail-notification
~~~

Each command prints a workspace URL. In each workspace, process the pay run once, then select Retry pay run and confirm. The employee is owed ₦150,000. The faulty version records ₦300,000 across two payments; the corrected version retains one ₦150,000 payment and recovers notification delivery. These are deliberately introduced reference behaviors, not defects discovered in the upstream project or a live MUST product.

Optional starting fixtures: single, standard, boundaries and empty. The scenario script accepts --fixture. It only connects to a localhost HTTP service.

## Verify and inspect evidence

~~~sh
npx playwright install --no-shell chromium
npm run verify
~~~

Verification builds the application, checks recovery in a fresh Node process, requires the selected regression to fail for the intended duplicate-payment reason, then runs the corrected browser/API suite. It generates a [source fingerprint and results summary](assessment/evidence/summary.json), JSON reports, logs, screenshots and a failure trace. An expected failure in the faulty example is part of the verification; a failure in the corrected suite blocks completion. No automatic test retries are configured.

Start with [intent.md](assessment/intent.md), then [directive.md](assessment/directive.md). Supporting documents contain the [business rules](assessment/business-rules.md), [test cases and outcomes](assessment/test-cases.md), [defect and root cause](assessment/defect-report.md), [release decision](assessment/release-readiness.md), [interface verification](assessment/ui-review.md) and [five-minute Loom outline](assessment/loom-outline.md).

## Scope and provenance

The payroll model pays the sum of approved project earnings. Taxes, deductions, salaried proration, leave, benefits, employee changes, external banking, authentication and statutory compliance are outside this exercise. NGN provides a concrete display currency; this is not payroll or legal advice. The simulated provider records notification acceptance, not verified delivery to a real inbox.

The project began from the MIT-licensed sample by Amit Rawat, pinned at upstream commit 73d83074e7ea0c40f8273455ebcb611b7088fd5a. Its original [license notice](LICENSE) is preserved. Payroll logic, local persistence, the redesigned interface and assessment evidence were added in this fork. The existing repository URL and branch name are retained to preserve its review history; the current product is MustPayroll.

AI assistance was used for implementation, test design, investigation and document drafting. Aniekan must personally review the evidence, explain the decisions and record the final Loom. No live incident, measured customer loss, employer data or reviewer-assigned score is claimed.
