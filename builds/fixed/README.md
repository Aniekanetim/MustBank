# MustPayroll fixed build

Build: mustpayroll-0.2.0-fixed-39fee999f9f3

Requires Node.js 22.13 or later. No dependency installation is needed for this prebuilt application.

Run npm start, then open http://127.0.0.1:4176/overview.

To prepare the reproduction, run npm run scenario -- --fail-notification and open its printed URL. Process once, then retry the original pay run.

This package contains only the fixed payment implementation. Its API rejects requests to switch implementation. The other build is a separate download with a separate database.

Payment records are synthetic local ledger entries. This is not a live payroll service. Source, test records and MIT attribution: https://github.com/Aniekanetim/MustBank
