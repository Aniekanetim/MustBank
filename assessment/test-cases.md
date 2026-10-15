# Test cases and results

All reward cases use synthetic tasks. Unless stated otherwise: task `task-001`, owner `user-001`, status completed, completion `2026-10-08T12:00:00Z`, scheduled run `2026-10-13T09:00:00Z`. Each case creates a fresh isolated example; none relies on earlier cases' records.

The final outcomes are in [summary.json](evidence/summary.json). TC01–TC10 and TC12–TC46 use Playwright's HTTP client or Chromium browser. TC11 opens persisted records in a fresh Node process. The table gives inputs and expected results; the raw reports record execution. Failure conditions are prepared through local fixture tooling or the API, outside the banking UI.

| Case | Input / action | Expected corrected outcome | Final result |
|---|---|---|---|
| TC01 | Settle one qualifying task | 10 credits; one payout to its owner; notification attempted after commit and sent | Pass |
| TC02 | No tasks | Zero credits, payouts and notifications | Pass |
| TC03 | Completion exactly 5 Oct 00:00 UTC | Included; 10 credits | Pass |
| TC04 | Completion exactly 12 Oct 00:00 UTC | Excluded; no notification | Pass |
| TC05 | 5 Oct 00:30 and 01:00 at +01:00 | First is before UTC start; second is at start; total 10 | Pass |
| TC06 | Pending and cancelled tasks inside window | Neither paid or notified | Pass |
| TC07 | Import identical task three times | One stored task and one 10-credit payout | Pass |
| TC08 | Replay after a successful run | One payout, one provider receipt, still 10 credits | Pass |
| TC09 | Fail notification before provider acceptance | Payment stays at 10; one pending message; no acceptance receipt | Pass |
| **TC10** | **Fail notification, settle, then replay the same settlement in the UI** | **First: 10 credits and pending delivery. Replay: still 10, one payout, delivery recovered** | **Pass; same assertion fails in faulty mode** |
| TC11 | Close service after payment + failed notification; reopen in a new process and replay | Original payout retained; 10 credits, notification recovered | Pass |
| TC12 | Fail payment before writing, then retry | First: zero credits and no notification. Retry: 10 credits | Pass |
| TC13 | Interrupt payment transaction before saving notification work | Both records roll back before commit. Retry makes one payout | Pass |
| TC14 | Upper-boundary task; run current week then 20 Oct twice | Zero first week; exactly 10 in next week after replay | Pass |
| TC15 | Same imported task ID has two owners | Reject entire batch with HTTP 400; no tasks or credits | Pass |
| TC16 | Valid task plus task with no timezone offset | Reject entire batch with HTTP 400; no partial import | Pass |
| TC17 | Eight overlapping HTTP settlement requests to one server | One payout, one provider receipt, 10 credits | Pass |
| TC18 | Provider accepts but acknowledgment is lost; replay | First pending with receipt; recovery leaves one receipt and one payout | Pass |
| TC19 | Tuesday 10:00 UTC or Wednesday 09:00 UTC run | Reject with HTTP 400; zero payment effects | Pass |
| TC20 | Change stored owner or completion time after payment | Reject both; original owner retains one 10-credit payout | Pass |
| TC21 | Record a second owner's activity in operations, then settle | Total 20; each owner has 10 | Pass |
| TC22 | Reload browser after failed notification; retry notifications | Persisted payout survives; delivery recovers without payment | Pass |
| TC23 | 30 February or `24:00:00` completion | Reject invalid timestamps; no saved tasks | Pass |
| TC24 | Prepare notification failure; use settlement and recovery controls by keyboard at 380px | 10 credits; delivery recovered; no whole-page horizontal overflow | Pass |
| TC25 | Enter SGD 10, review details, then confirm once | Review leaves balance unchanged; receipt records one transfer and $472.35 remaining | Pass |
| TC26 | Visit overview, transfers, recipients, activity and rewards | MustBank title and normal product copy; no assessment language or customer settlement controls | Pass |
| TC27 | Open compatible data from a prior namespace, then replay a paid reward | Original balance and rewards account retained; still one payout and 10 credits; storage migrated | Pass |
| TC28 | Enter `10abc`, zero, or more than the available balance | Clear validation; no transfer or balance change | Pass |
| TC29 | Review SGD 10, return to edit, then exit to overview | Amount retained; account balances unchanged before confirmation | Pass |
| TC30 | Save a recipient, search for them, then choose Send money | Transfer opens with the saved recipient selected | Pass |
| TC31 | Search for an absent entry, clear filters, then select Failed | Recoverable empty state; five records restored; unmatched status remains clear | Pass |
| TC32 | Settle one task for each of two owners; open personal rewards | Customer sees only their own 10 credits and records; operations reconciles 20; customer response omits processing mode and failure state | Pass |
| TC33 | Export rewards with a formula-like activity title and another owner's payout | CSV contains only the current customer's payout and safely quotes the formula-like cell | Pass |
| TC34 | Navigate all five customer pages at 320px | Navigation works; no whole-page horizontal overflow | Pass |
| TC35 | Start a generic transfer, enter 10 and review without choosing a payee | No recipient preselected; corrective error focuses recipient; no payment | Pass |
| TC36 | Draft 175 from savings with a description, add and review a new recipient, return and reload | Account, amount and description retained; new recipient selected; no payment before confirmation | Pass |
| TC37 | Cancel recipient creation; open and cancel draft discard, then confirm discard | Cancellation preserves inputs; Escape restores focus; confirmed discard clears the draft | Pass |
| TC38 | Complete payment, leave receipt, reopen from activity, reload, copy and download | Same reference and balance snapshot; clipboard and receipt contain correct evidence | Pass |
| TC39 | Complete payment; review and save a recipient name, bank and account change | Future recipient changes; earlier receipt retains original destination and balance | Pass |
| TC40 | Cancel recipient removal, then confirm it; open an earlier payment | Confirmation required; removed payee absent from future selection; old receipt retained | Pass |
| TC41 | View the same internal transfer from savings and checking; open receipt and return | Savings shows −500 / money out; checking +500 / money in; return preserves account filter | Pass |
| TC42 | Freeze 15 Oct; include 8 Oct activity and exact 12 Oct boundary; settle 13 Oct | Old activity delayed until paid; boundary activity due 20 Oct; credits stay separate from SGD | Pass |
| TC43 | View rewards at 320px, then review a transfer | Activity table begins within the first 800px; no page overflow; confirmation clears fixed navigation | Pass |
| TC44 | Select payee, enter amount, review, edit and confirm with keyboard | Correct focus at each stage; payment receipt heading receives focus | Pass |
| TC45 | Complete a transfer, navigate browser back/forward, reload receipt and start another | One recorded payment; same receipt; fresh transfer has no implicit payee or old amount | Pass |
| TC46 | Review a transfer while another tab edits its recipient | Destination choice invalidated; amount and description preserved; stale review cannot proceed | Pass |

## Core regression evidence

| Run | First attempt | After settlement replay | Interpretation |
|---|---|---|---|
| Faulty | 10 credits, one payout, one pending message | 20 credits, two payouts, one pending message | TC10 fails the unchanged 10-credit assertion |
| Corrected | 10 credits, one payout, one pending message | 10 credits, one payout, zero pending messages | TC10 passes; recovery adds no payout |

The faulty flow sends a new message for the second payout; its earlier failed message remains pending. The corrected flow retries the original pending work. These are actual states from this extension, not evidence copied from an earlier demo.

See the [faulty report](evidence/faulty-playwright.json), [corrected report](evidence/fixed-playwright.json), [process recovery log](evidence/process-recovery.log), and [before/after artifacts](directive.md#results-and-handoff-appendix). Automatic test retries are disabled. TC17 covers arrivals handled by one Node process; distributed concurrency remains unverified.
