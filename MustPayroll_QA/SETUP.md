# Set up and verify MustPayroll

Run these commands from MustPayroll_QA. Requires Node.js 22.13 or later.

## Install dependencies once

~~~sh
npm ci
npm ci --prefix ../MustBank/Mustpayroll_buggy
npm ci --prefix ../MustBank/MustPayroll_fixed
npx playwright install --no-shell chromium
~~~

Each application has its own package.json, lockfile and dependency installation. There is no shared application source or shared application node_modules folder. The QA package has its own Playwright and TypeScript dependencies.

## Run the complete verification

~~~sh
npm run verify
~~~

The command rebuilds each app through that app's own build script, verifies each app in a copied standalone folder, executes the same 33 Playwright checks and one Node fresh-process check against each, and generates separate completed case tables, reports, logs and observed state. The expected buggy failures must occur for the documented business reasons; every fixed check must pass. Unexpected failures, skips, timeouts or retries block verification.

Results are under [executions/buggy](executions/buggy/README.md) and [executions/fixed](executions/fixed/README.md). Each includes all eight core cases and the full 34-check suite. Automated tests use isolated databases under this QA project's data folder and do not change the manually reviewable applications' databases.

## Start and inspect the applications

~~~sh
npm run start:pair
~~~

For either application alone, open its own folder and use npm start. Its committed compiled interface and Node built-ins are sufficient; npm ci is needed only to rebuild or develop it. See the [application guide](application-builds.md).

With the applications running, prepare separate fresh examples from this QA folder:

~~~sh
npm run scenario -- --build faulty --fail-notification
npm run scenario -- --build fixed --fail-notification
~~~

Open each printed pay-run URL. Process once, then retry the same run. The employee is owed NGN150,000. The buggy retry records NGN300,000 across two payments; the fixed retry retains the original NGN150,000 payment and recovers its notification.

## Reports and optional media

~~~sh
npx playwright show-report executions/buggy/playwright/html-report
npx playwright show-report executions/fixed/playwright/html-report
~~~

Screenshots and browser automation videos are optional. To capture them in PowerShell:

~~~powershell
$env:QA_CAPTURE_MEDIA = '1'
npm run verify
Remove-Item Env:QA_CAPTURE_MEDIA
~~~

Reports, logs, results and state remain available without enabling media. The candidate's required final Loom is separate from any automation recording. See [evidence requirements](assessment/evidence-requirements.md).

## Review and publish

Start with [intent.md](assessment/intent.md), then [directive.md](assessment/directive.md), [the defect](assessment/defect-report.md) and [release readiness](assessment/release-readiness.md). Personal review and final Loom remain pending.

After publishing, npm run reviewer:access checks the required public documents, result records and every application file without sending credentials. Use -- --ref followed by a full commit SHA to pin the check. Generated HTML reports and bulk runner artifacts are retained locally and in CI artifacts; the versioned JSON reports, logs and CSVs remain directly reviewable in the repository.
