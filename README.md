# MustBank

MustBank is a local banking prototype with customer account, transfer, recipient, activity and rewards flows. Weekly payout processing lives in a separate operations workspace. The customer experience uses normal product language; fixture creation and failure injection are handled outside the app.

This repository is the QA Quest submission project. It uses synthetic accounts, credits and providers, and never moves real money. Start with [intent.md](assessment/intent.md), then [directive.md](assessment/directive.md) for the business requirements, regression evidence and handoff. The [defect report](assessment/defect-report.md) explains why retrying settlement after a notification failure can pay a task twice.

## Run MustBank

Use **Node 22.13 or later**; verification uses **22.21.0**. Node's SQLite module emits an experimental-feature warning on that version. No API key or database server is required.

```sh
git clone --branch quest/rewards-settlement https://github.com/Aniekanetim/MustBank.git
cd MustBank
npm ci
npm run dev
```

Open **http://127.0.0.1:5173** for personal banking. The command starts the frontend and the API. The operations workspace is **http://127.0.0.1:5173/operations/settlements**.

For a single server serving the production build and API:

```sh
npm run build
npm start
```

Open **http://127.0.0.1:4174**. The root opens the account overview. Rewards records are persisted in `data/rewards.sqlite`; the browser caches only the selected rewards account ID. Account balances and transfers use local browser storage. Compatible previous storage namespaces migrate automatically, preserving balances and payment identity.

Transfers require a deliberate recipient choice and keep a draft in the current tab. Adding or cancelling a recipient returns to that draft. Completed payments have a permanent local receipt under `/transactions/:id`, with reference copying and a text download. Recipient changes require review, and removing a recipient retains earlier receipts. New recipient numbers are kept in the local prototype store; lists and receipts mask them to the account ending. Use synthetic details only.

Rewards distinguish program credits from SGD, surface scheduled or delayed payments, and show activities before compact payout history. This program has no redemption or cash conversion. Mobile personal banking uses a fixed bottom navigation bar with space reserved beneath page controls.

## Reproduce the selected defect

Keep the built app running, then prepare an isolated faulty rewards account from a second terminal:

```sh
npm run scenario -- --behavior faulty --fail-notification
```

The command prints an **Operations URL** and a **Customer URL** for the same rewards account. Open the Operations URL and:

1. Keep the scheduled run at Tuesday **13 October 2026, 09:00 UTC**.
2. Click **Run settlement**. Observe **10 credits, one payout, one pending confirmation**.
3. Click **Run settlement** again. Faulty processing produces **20 credits and two payouts** for one activity.

Prepare the corrected reference using the same starting conditions:

```sh
npm run scenario -- --behavior fixed --fail-notification
```

Repeat the same two runs in its Operations URL. Credits stay at **10**, payout count stays at **one**, and the pending confirmation is recovered. The Customer URL shows that customer's reward history without fixture controls or processing-version labels. Fixture setup is restricted to localhost; existing accounts and records are preserved separately.

`--fixture boundaries` provides UTC cut-off examples; `--fixture empty` starts with no activities. For the development API, the setup command still uses port 4174 and its printed links open the API's built page. Open the same path at port 5173 when using the development frontend.

## Verify

```sh
npx playwright install --no-shell chromium
npm run verify
```

Verification uses isolated servers on **4184 and 5183**, so it can run alongside the local preview. It builds the app, checks persistence in a fresh Node process, proves that TC10 fails at 20 credits against faulty processing, then runs the complete corrected suite. The intentional failed assertion is required evidence; overall verification succeeds only when the failure and corrected passes are confirmed.

See [case results](assessment/test-cases.md), [summary and source hashes](assessment/evidence/summary.json), screenshots, snapshots and raw reports. `npm test` runs the corrected Playwright suite; `npm run test:service` runs process recovery. Open the recorded failure with `npx playwright show-trace assessment/evidence/faulty-trace.zip`.

## Scope and attribution

The banking UI is a functional local prototype, not a production bank. There is no real payment provider, notification provider, scheduler or production authentication. The customer rewards projection represents fixture customer `user-001`; separate customer and operations screens are not an authorization system. See the [release decision](assessment/release-readiness.md) for limits, including personal review, Loom and recruiter submission details.

MustBank adapts MIT-licensed work by [Amit Rawat](https://github.com/sahajamit), starting at commit `73d83074e7ea0c40f8273455ebcb611b7088fd5a`. The [copyright notice](LICENSE) and commit history are preserved. The controlled rewards defect was introduced for this Quest and is not a claim about an upstream or MUST production incident.
