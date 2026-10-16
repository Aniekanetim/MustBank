# Run the applications and tests

Requires Node.js 22.13 or later. Run these commands from QA/Quality Control/execute_test_cases.

## Install dependencies

~~~sh
npm ci
npm ci --prefix ../../../MustBank/Mustpayroll_buggy
npm ci --prefix ../../../MustBank/MustPayroll_fixed
npx playwright install --no-shell chromium
~~~

This folder owns the test dependencies, Playwright configuration, page objects, execution scripts and generated results. Each application owns its source, lockfile and build/start commands. The designed case tables remain in the adjacent test_cases folder. Automation paths in those tables are relative to this execution folder.

The case CSVs have ten columns with separate Preconditions and numbered Steps. Scenario is the high-level area; Test Case Desc states the specific check. Designed tables leave Actual Result blank and use NOT RUN. Executed tables report the responses and values observed in that build, with PASS or FAIL. Case observations are retained inside the existing Playwright report and structured execution record. Build identity and verification links appear in Comments.

## Execute quality control against both builds

~~~sh
npm run verify
~~~

This rebuilds each application using its own build command, then executes the same 33 Playwright checks and one Node fresh-process check against each. Completed cases, actual results, reports and logs are written separately to [results/buggy](results/buggy/README.md) and [results/fixed](results/fixed/README.md). Test databases are isolated under this project's data directory; the applications' normal databases are preserved.

The Playwright [specs](test/specs) use [page objects](test/pages) for browser actions. The assessed build identities are recorded in [results/builds.json](results/builds.json). Test dependencies and temporary test data stay inside this execution folder.

The documented buggy failures must occur for the recorded business reasons, and every fixed check must pass. Unexpected failures, skips, timeouts and retries block verification.

## Start the applications

For manual review, open two terminals in this execution folder. Start the buggy application in the first:

~~~sh
npm --prefix ../../../MustBank/Mustpayroll_buggy start
~~~

Start the fixed application in the second:

~~~sh
npm --prefix ../../../MustBank/MustPayroll_fixed start
~~~

The buggy app runs on http://127.0.0.1:4175/overview and the fixed app on http://127.0.0.1:4176/overview. Either can also be started independently with npm start inside its own application folder. Its committed compiled interface requires no dependency installation to serve.

With both applications running, use another terminal in this execution folder to prepare a fresh reproduction in each:

~~~sh
npm run scenario -- --build faulty --fail-notification
npm run scenario -- --build fixed --fail-notification
~~~

Open each printed pay-run URL, process once, then retry that same run. Approved pay is NGN150,000. The buggy retry records NGN300,000 across two payments. The fixed retry retains the original NGN150,000 payment and recovers notification. See the [defect report](../bug_report/PAY-001.md) for the complete steps and expectation.

## Review assurance, findings and submission

Start with the QA [intent.md](../../Quality%20assurance/intent.md), then [directive.md](../../directive.md), [the defect](../bug_report/PAY-001.md) and [release readiness](../../Quality%20assurance/release_readiness.md). directive.md links the runnable project, cases, results and verification evidence. The candidate's final Loom and personal sign-off remain pending.

The QA release checklist defines acceptance conditions; directive.md records the actual decision based on QC results. To update the designed case tables after editing the catalogue, run npm run qc:design.
