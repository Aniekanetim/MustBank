# MustPayroll

The current applications are available as **two separate plain folders**: [buggy](builds/buggy) and [fixed](builds/fixed). See [how to run each independently](builds/README.md). No archive extraction or dependency installation is needed for these folders. Their file hashes and a direct run are recorded in [folder verification](assessment/evidence/folder-verification.json). Earlier archive-format instructions below remain until the candidate approves the cleanup proposal.

MustPayroll is a focused payroll application for reviewing approved earnings, processing weekly pay runs and recovering payment notifications. The application uses synthetic employees and a local payment ledger. It connects to no bank, payroll provider or live financial system.

The QA investigation follows one failure: **a payment succeeds, its notification fails, and retrying payroll pays the employee again.** The same business assertion fails against deliberately faulty behavior and passes against the corrected implementation.

## Two builds and two executed test records

| Application build | Test record | Browser recording |
|---|---|---|
| [Faulty MustPayroll](assessment/builds/MustPayroll-faulty.zip) | [Before correction](assessment/test-records/faulty.md) | [Faulty TC10](assessment/test-records/faulty-TC10.webm) |
| [Fixed MustPayroll](assessment/builds/MustPayroll-fixed.zip) | [After correction](assessment/test-records/fixed.md) | [Fixed TC10](assessment/test-records/fixed-TC10.webm) |

Each archive contains the compiled interface, backend and exactly one payment implementation. It runs independently on Node.js 22.13 or later without installing application dependencies. Download either archive, extract it, open a terminal in its MustPayroll folder and run npm start. The faulty app opens on http://127.0.0.1:4175/overview and the fixed app on http://127.0.0.1:4176/overview. Their databases are separate. The API rejects attempts to switch implementation.

The [comparison](assessment/test-records/README.md) connects each executed result to its build ID, package SHA-256 and the same test-suite fingerprint. The [policy patch](assessment/builds/fix.patch) shows the correction. These are two runnable builds with two full execution records.

## Build and run both from source

Use Node.js 22.13 or later and npm.

~~~sh
npm ci
npm run build:pair
npm run start:pair
~~~

Open the two URLs above. To start just one, use npm run start:faulty or npm run start:fixed. The launcher checks each packaged runtime against its manifest before starting it. A new browser workspace contains three employees and ₦435,000 of approved earnings for the 13 October 2026 pay date. An additional pending earning belongs to the following period.

For development, npm run dev serves the interface on port 5173 and the corrected development backend on 4174. Use the packaged 4175/4176 applications for the assessment comparison. PAYROLL_DB, PORT and HOST can override local defaults. Keep this unauthenticated application bound to localhost.

## Follow the payroll journey

1. Review the employee directory and masked payment destinations.
2. Record earnings with an employee, earning date, NGN amount and approval status. Approve pending records before processing their period.
3. Open Pay runs. Review the selected period, approved total and employee breakdown, then confirm processing.
4. Inspect payment records and open a receipt. Export payments or download a receipt for handoff.
5. If notification delivery is pending, recover it from Notifications. Successful payments remain recorded.

The UI uses normal payroll language. Fault injection remains in local setup tooling; the chosen executable package fixes the implementation.

## Reproduce the selected defect

With both packaged servers running, prepare one fresh example in each build:

~~~sh
npm run scenario -- --build faulty --fail-notification
npm run scenario -- --build fixed --fail-notification
~~~

Each command prints a workspace URL. In each workspace, process the pay run once, then select Retry pay run and confirm. The employee is owed ₦150,000. The faulty version records ₦300,000 across two payments; the corrected version retains one ₦150,000 payment and recovers notification delivery. These are deliberately introduced reference behaviors, not defects discovered in the upstream project or a live MUST product.

Optional starting fixtures: single, standard, boundaries and empty. The scenario script accepts --fixture. It only connects to a localhost HTTP service.

## Verify and inspect evidence

~~~sh
npx playwright install --no-shell chromium
npm run verify
~~~

Verification builds both application packages and executes the same full suite against each: 33 Playwright browser/API checks and one fresh-process check. It requires the faulty failures to match the observed defect conditions and all 34 corrected checks to pass. It saves two test records and a real TC10 browser video for each build. It generates a [source fingerprint and results summary](assessment/evidence/summary.json), JSON reports, logs, screenshots and a failure trace. An expected failure in the faulty example is part of the verification; a failure in the corrected suite blocks completion. No automatic test retries are configured.

Start with [intent.md](assessment/intent.md), then [directive.md](assessment/directive.md). Supporting documents contain the [business rules](assessment/business-rules.md), [test cases and outcomes](assessment/test-cases.md), [defect and root cause](assessment/defect-report.md), [release decision](assessment/release-readiness.md), [interface verification](assessment/ui-review.md) and [five-minute Loom outline](assessment/loom-outline.md).

The [generated business proof](assessment/evidence/business-proof.md) explains the observed payment outcome before listing test totals. It is regenerated by verification and requires the original corrected payment and message identities to survive recovery. The [operations runbook](assessment/operations-runbook.md) turns that evidence into safe recovery and escalation instructions.

The [expectation review](assessment/expectation-review.md) uses the supplied transcript as the working source of truth, with payroll replacing its earlier project example. The [AI accountability record](assessment/ai-accountability.md), [personal review guide](assessment/personal-review.md) and [Loom script](assessment/loom-script.md) prepare the candidate-owned handoff without claiming review or recording that has not happened.

After publishing, run npm run reviewer:access to verify project documents, evidence and a downloadable source archive without sending credentials. Use -- --ref followed by a full commit SHA to pin the check. The [access report](assessment/evidence/reviewer-access.json) excludes the still-unprovided final Loom and genuine portfolio cases. A repository link gives reviewer access to this local project; no public payroll deployment is needed.

## Scope and provenance

The payroll model pays the sum of approved project earnings. Taxes, deductions, salaried proration, leave, benefits, employee changes, external banking, authentication and statutory compliance are outside this exercise. NGN provides a concrete display currency; this is not payroll or legal advice. The simulated provider records notification acceptance, not verified delivery to a real inbox.

The project began from the MIT-licensed sample by Amit Rawat, pinned at upstream commit 73d83074e7ea0c40f8273455ebcb611b7088fd5a. Its original [license notice](LICENSE) is preserved. Payroll logic, local persistence, the redesigned interface and assessment evidence were added in this fork. The existing repository URL and branch name are retained to preserve its review history; the current product is MustPayroll.

AI assistance was used for implementation, test design, investigation and document drafting. Aniekan must personally review the evidence, explain the decisions and record the final Loom. No live incident, measured customer loss, employer data or reviewer-assigned score is claimed.
