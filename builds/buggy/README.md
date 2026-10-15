# MustPayroll buggy application

Build: mustpayroll-0.2.0-faulty-836ba86495ff

This is an independent application folder containing its backend, compiled interface and one payment implementation. Requires Node.js 22.13 or later; no dependency installation is needed.

Open a terminal in this folder, run npm start, then visit http://127.0.0.1:4175/overview.

To prepare the reproduction, run npm run scenario -- --fail-notification in another terminal in this folder. Open the printed URL, process once, then retry the original pay run.

The employee is owed NGN150,000. The buggy retry records NGN300,000 across two payments.

The API rejects requests to switch implementation. This app stores its own database in data/payroll.sqlite. Rebuilding updates application files without removing that database.

Inspect server/payment-policy.mjs for this implementation. Shared editable frontend source and the full test suite are at the repository root. [Test record](../../qa/executions/buggy/README.md).

Payment records are synthetic local ledger entries. This is not a live payroll service. Source and MIT attribution: https://github.com/Aniekanetim/MustBank
