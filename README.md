# MustPayroll

MustPayroll reviews approved earnings, processes weekly pay runs and recovers payment notifications using synthetic employees and a local payment ledger. It connects to no real bank or payroll provider.

## Run the applications independently

| Application | Plain folder | Local URL | Executed test record |
|---|---|---|---|
| Buggy | [builds/buggy](builds/buggy) | http://127.0.0.1:4175/overview | [Before correction](assessment/test-records/faulty.md) |
| Fixed | [builds/fixed](builds/fixed) | http://127.0.0.1:4176/overview | [After correction](assessment/test-records/fixed.md) |

Each folder contains its own backend, payment implementation, compiled interface and package.json. Use Node.js 22.13 or later. No dependency installation is needed to run either folder.

From the repository root, start the buggy app in one terminal:

~~~sh
npm --prefix builds/buggy start
~~~

Start the fixed app in another terminal:

~~~sh
npm --prefix builds/fixed start
~~~

Each app keeps its own database at data/payroll.sqlite inside its folder. The API rejects attempts to switch implementation. The UI uses ordinary payroll language; failure preparation stays in local setup tooling.

## Confirm the failure and correction

With both apps running, prepare one fresh example in each:

~~~sh
npm --prefix builds/buggy run scenario -- --fail-notification
npm --prefix builds/fixed run scenario -- --fail-notification
~~~

Open each command's printed pay-run URL. The employee is owed NGN150,000. Process payroll once, observe the successful payment and pending notification, then retry that same pay run. The buggy app records two payments totaling NGN300,000. The fixed app preserves the original NGN150,000 payment and recovers its original message. These defects were introduced for the local example; they are not incidents discovered in the upstream sample or a live MUST product.

## Build, test and review

The shared editable source is in src/, server/ and tests/. To rebuild both folders and execute the same full suite against each:

~~~sh
npm ci
npx playwright install --no-shell chromium
npm run verify
~~~

Verification updates builds/buggy and builds/fixed while preserving their databases. It checks the exact runtime file hashes and served build IDs, executes 33 browser/API checks and one fresh-process check against each folder, and regenerates two test records with logs, state evidence and real TC10 browser videos. The known faulty failures must occur for the documented business reasons; all 34 fixed checks must pass. Unexpected failures, skips and timeouts fail verification.

For a build without running tests, use npm run build:pair. The root commands npm run start:pair, npm run start:buggy and npm run start:fixed validate the generated files before launching. Development uses npm run dev, with the corrected API on port 4174 and Vite on 5173. Keep the unauthenticated servers on localhost.

Start with [intent.md](assessment/intent.md), then [directive.md](assessment/directive.md). Follow the [payroll rules](assessment/business-rules.md), [case register](assessment/test-cases.md), [defect and cause](assessment/defect-report.md), [generated business proof](assessment/evidence/business-proof.md), [release decision](assessment/release-readiness.md) and [recovery runbook](assessment/operations-runbook.md). The [AI record](assessment/ai-accountability.md), [personal review](assessment/personal-review.md) and [Loom script](assessment/loom-script.md) support the candidate's own handoff.

The supplied transcript is the working source of truth, adapted to payroll. The final candidate Loom and personal sign-off remain pending; automation recordings do not replace them.

After publishing, run npm run reviewer:access to check documents, recordings and every file needed to run both app folders without sending credentials. Add -- --ref followed by a full commit SHA to pin the check. The [access report](assessment/evidence/reviewer-access.json) excludes the final Loom until its link is supplied. A public payroll deployment is not required to reproduce this local project.

## Scope and provenance

The payroll model pays the sum of approved project earnings. Taxes, deductions, salaried proration, leave, benefits, employee changes, external banking, authentication and statutory compliance are outside this exercise. NGN provides a concrete display currency; this is not payroll or legal advice. The simulated provider records notification acceptance, not verified delivery to a real inbox.

The project began from the MIT-licensed sample by Amit Rawat, pinned at upstream commit 73d83074e7ea0c40f8273455ebcb611b7088fd5a. Its original [license notice](LICENSE) is preserved. Payroll logic, local persistence, the redesigned interface and assessment evidence were added in this fork. The existing repository URL and branch name are retained to preserve its review history; the current product is MustPayroll.

AI assistance was used for implementation, test design, investigation and document drafting. Aniekan must personally review the evidence, explain the decisions and record the final Loom. No live incident, measured customer loss, employer data or reviewer-assigned score is claimed.
