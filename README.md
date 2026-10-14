# AcmeBank QA Quest

A completed task should earn **10 fictional credits once**. This assessment extension demonstrates how a failed notification can cause a duplicate payout, and how payment records prevent that mistake on a retry.

Start with [intent.md](assessment/intent.md) for the problem choice, then [directive.md](assessment/directive.md) for the requirements, results and handoff. The [defect report](assessment/defect-report.md) connects the observed failure to the fix.

## Run the example

Use **Node 22.13 or later**; verification uses Node **22.21.0**. Node's SQLite module emits an experimental-feature warning on that version. No database server, API key or browser extension is needed.

```sh
git clone --branch quest/rewards-settlement https://github.com/Aniekanetim/webmcp-acmebank-demo.git
cd webmcp-acmebank-demo
npm ci
npm run dev
```

Open **http://127.0.0.1:5173/rewards**. The development command starts the web page and API. SQLite records live in `data/rewards.sqlite`; the browser stores only the current example's ID. Each new example has separate records, so changing behavior cannot turn an already-paid task into a fresh payment.

To see the failure:

1. Choose **Faulty assessment example**, keep **One qualifying task**, then click **Start new example**.
2. Click **Fail next notification**, then **Run settlement**. Observe 10 credits and one pending notification.
3. Click **Run settlement** again. Observe **20 credits and two payout records** for one task.
4. Start a new **Corrected reference** example and repeat. The result stays at **10 credits and one payout**; notification delivery recovers.

**Export example** downloads the current records and event history as JSON. The original simulated bank pages remain in the sidebar; their SGD balances are separate from rewards credits.

## Verify the result

```sh
npx playwright install --no-shell chromium
npm run verify
```

Stop the development server first: verification starts its own servers on ports 4174 and 5173. It builds the app, checks recovery in a fresh Node process, confirms that the faulty behavior fails TC10 for the duplicate-payment reason, then runs all corrected Playwright cases. The deliberate failed assertion is required evidence; the overall command succeeds only when that failure and the corrected passes are confirmed.

The [evidence summary](assessment/evidence/summary.json), [case results](assessment/test-cases.md), screenshots and raw reports are committed for reviewers. A fresh run updates them. `npm test` runs the corrected Playwright suite; `npm run test:service` runs process recovery. Open the failed-run trace with `npx playwright show-trace assessment/evidence/faulty-trace.zip`.

For one local server serving the built page and API:

```sh
npm run build
npm start
```

Then open **http://127.0.0.1:4174/rewards**. A static-only host would need a separate API. This fork is a reproducible local demo, with source and evidence available on GitHub.

## Source and limits

The foundation is Amit Rawat's MIT-licensed [webmcp-acmebank-demo](https://github.com/sahajamit/webmcp-acmebank-demo), starting at commit `73d83074e7ea0c40f8273455ebcb611b7088fd5a`. Its [original README](docs/upstream-readme.md) is retained for attribution and historical context. The rewards module and deliberately faulty mode were added for this Quest; the defect report makes no claim about an upstream incident.

WebMCP is optional and disabled by default. To explore the original integration, copy `.env.example` to `.env.local`, enable `VITE_ENABLE_WEBMCP`, and restart/rebuild. The Quest checks use HTTP and ordinary browser controls through Playwright.

All credits and provider responses are simulated. See the [release decision](assessment/release-readiness.md) for scope, gaps and submission tasks. The inherited [MIT license](LICENSE) is preserved.
