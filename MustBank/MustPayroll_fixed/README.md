# MustPayroll fixed application

This folder is a complete, independent application. It contains its own editable frontend, backend, payment implementation, compiled interface, build tooling, dependency lockfile and database location. It has no runtime or build dependency on the other application or the QA project.

## Run

Requires Node.js 22.13 or later. From this folder:

~~~sh
npm start
~~~

Open http://127.0.0.1:4176/overview. The committed interface is already compiled; starting the application requires no dependency installation. Data is stored only in this folder's data/payroll.sqlite.

## Rebuild or develop

~~~sh
npm ci
npm run build
npm start
~~~

For development, npm run dev starts this API on 4176 and this folder's Vite interface on 5176. Rebuilding preserves the local database. The build command fingerprints this application's own source and writes build-manifest.json and server/build-info.mjs.

## Payment implementation

Inspect server/payment-policy.mjs. The corrected implementation uses committed payment identity and an atomic payment/outbox transaction. Recovering a notification preserves the original payment. This application contains only this implementation; its API rejects attempts to switch it.

All employees and payment records are synthetic. The local ledger does not move real money. Keep the unauthenticated server on localhost. MIT attribution is retained in LICENSE.
