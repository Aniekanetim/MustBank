# Run the applications and tests

Requires Node.js 22.13 or later. Run the setup and test commands from MustPayroll_QA.

## Install dependencies

~~~sh
npm ci
npm ci --prefix ../MustBank/Mustpayroll_buggy
npm ci --prefix ../MustBank/MustPayroll_fixed
npx playwright install --no-shell chromium
~~~

Each application owns its source, lockfile and build tools. The quality-control area owns the case catalogue, tests and execution scripts. The project root provides their shared dependencies and application tooling.

## Execute quality control against both builds

~~~sh
npm run verify
~~~

This rebuilds each application using its own build command, then executes the same 33 Playwright checks and one Node fresh-process check against each. Completed cases, actual results, reports and logs are written separately to [executions/buggy](quality-control/executions/buggy/README.md) and [executions/fixed](quality-control/executions/fixed/README.md). Test databases are isolated under this project's data directory; the applications' normal databases are preserved.

The documented buggy failures must occur for the recorded business reasons, and every fixed check must pass. Unexpected failures, skips, timeouts and retries block verification.

## Start the applications

~~~sh
npm run start:pair
~~~

The buggy app runs on http://127.0.0.1:4175/overview and the fixed app on http://127.0.0.1:4176/overview. Either can also be started independently with npm start inside its own application folder. Its committed compiled interface requires no dependency installation to serve.

With both applications running, prepare a fresh reproduction in each from this QA directory:

~~~sh
npm run scenario -- --build faulty --fail-notification
npm run scenario -- --build fixed --fail-notification
~~~

Open each printed pay-run URL, process once, then retry that same run. Approved pay is NGN150,000. The buggy retry records NGN300,000 across two payments. The fixed retry retains the original NGN150,000 payment and recovers notification. See the [defect report](quality-control/defect-report.md) for the complete steps and expectation.

## Review assurance, findings and submission

Start with the QA [intent.md](quality-assurance/intent.md), then [directive.md](directive.md), [the defect](quality-control/defect-report.md) and [release readiness](quality-assurance/release-readiness.md). directive.md links the runnable project, cases, results and verification evidence. The candidate's final Loom and personal sign-off remain pending.

The QA release checklist defines acceptance conditions; directive.md records the actual decision based on QC results. To update the designed case tables after editing the catalogue, run npm run qc:design.
