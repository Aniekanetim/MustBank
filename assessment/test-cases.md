# Payroll test cases and results

The assessed application is MustPayroll. Unless specified otherwise, each case creates an isolated workspace in the application build under test, one approved ₦150,000 earning for emp-001 on 8 October 2026, and the 13 October 09:00 UTC pay date. Its period is [5 October 00:00 UTC, 12 October 00:00 UTC). All amounts below describe synthetic local ledger records.

The [verification summary](evidence/summary.json) records the environment and source fingerprints. TC01–TC09, TC12–TC22 and TC34 exercise HTTP APIs. TC10 and TC23–TC33 exercise Chromium UI journeys. TC11 closes the database and spawns a fresh Node process. The same 34 checks execute against each build with unchanged business expectations and no automatic retries. The [faulty record](test-records/faulty.md) and [fixed record](test-records/fixed.md) report every result separately. The table below defines the inputs and positive expectations; its result column describes the fixed run.

| Case | Input and action | Expected outcome | Corrected result |
|---|---|---|---|
| TC01 | Standard fixture: Amara 120,000 + 30,000; Daniel 200,000; Zara 85,000; process | Three payments totaling ₦435,000; Amara has one ₦150,000 payment; notifications sent | Passed |
| TC02 | Earning at opening Monday 5 October 00:00Z | Included; ₦150,000 recorded | Passed |
| TC03 | Boundary fixture: 10,000 at opening boundary, 20,000 before it, 30,000 just before closing, 40,000 at closing; process both periods | First period ₦40,000 from start + last; closing-boundary ₦40,000 paid in next period | Passed |
| TC04 | Earnings at 5 October 00:30+01:00 and 01:00+01:00 | First normalizes to prior Sunday and is excluded; second included; ₦150,000 total | Passed |
| TC05 | Import the identical earning twice, then process | One earning; one ₦150,000 payment | Passed |
| TC06 | Import new earning followed by existing ID with changed amount | HTTP 409; entire batch rolled back; original record preserved | Passed |
| TC07 | Only pending earning; attempt processing | HTTP 409; period stays open; no payment or notification | Passed |
| TC08 | One-shot payment failure before write; process and retry | First attempt has no payment/message/provider acceptance; retry records one ₦150,000 payment | Passed |
| TC09 | One-shot notification failure before acceptance | Payment remains ₦150,000; one pending message; payment commit precedes notification attempt | Passed |
| TC10 | UI: process, notification fails, retry the original pay run | One payment remains ₦150,000; notification recovers | Passed; identical assertion fails at ₦300,000 in faulty example |
| TC11 | Payment succeeds and message fails; close database, reopen in fresh Node process and retry | Same payment ID and ₦150,000 amount; no pending notification | Passed |
| TC12 | After notification failure, use notification-only recovery | Payment objects remain identical; message sent; one provider acceptance | Passed |
| TC13 | Interrupt between payment insert and outbox insert; retry | First transaction leaves neither record; retry records one payment with message work | Passed |
| TC14 | Provider accepts but acknowledgment is lost; retry | One provider acceptance, one payment, no pending notification | Passed |
| TC15 | Process period, then attempt a new earning inside it | HTTP 409; approved and recorded totals remain ₦150,000 | Passed |
| TC16 | Eight overlapping processing requests to one Node server, with first notification failure | One ₦150,000 payment; notification recovered | Passed; not a distributed-worker test |
| TC17 | Pay employee this period, then add ₦50,000 next period and process it | Separate employee-period payment; two records across periods; next-period total ₦50,000 | Passed |
| TC18 | Timestamp without offset, impossible date/hour, and a Wednesday pay date | HTTP 400 for invalid inputs | Passed |
| TC19 | Zero, negative, fractional-kobo, excessive and string amounts; then one kobo | Invalid amounts rejected; valid minimum pays ₦0.01 | Passed |
| TC20 | Unknown employee earning; empty approved period | Earning rejected; empty processing rejected; no invented employee payment | Passed |
| TC21 | Same earning/employee IDs in two isolated workspaces | Processing one does not alter the other; each can independently pay ₦150,000 | Passed |
| TC22 | Approve pending earning twice; attempt approval of rejected earning | Approval replay harmless; rejected approval refused; only approved ₦150,000 contributes | Passed |
| TC23 | UI: record pending ₦150,000.25, approve, review and confirm | Correct amount in confirmation and ledger | Passed |
| TC24 | UI: open processing confirmation, then Escape | Dialog closes, focus returns, period and ledger unchanged | Passed |
| TC25 | Open receipt, reload, copy reference and download receipt | Stable reference, correct employee and retrievable receipt | Passed |
| TC26 | Process standard fixture, filter Daniel and export | One visible record; CSV contains Daniel's ₦200,000 and excludes Amara | Passed |
| TC27 | Switch overview from processed 13 October to 20 October | Correct next period; recorded pay zero; one pending approval | Passed |
| TC28 | Open seven core routes at 320px | No horizontal page overflow; payroll navigation remains reachable | Passed |
| TC29 | Keyboard skip link, navigate to pay run, open dialog, Tab and Escape | Main/title focus, confirmation order and focus restoration work | Passed |
| TC30 | Directory → Daniel → Record earnings | Correct masked destination and Daniel preselected in form | Passed |
| TC31 | Open standard overview and employee directory | ₦435,000 total; payroll language; no banking/assessment labels in rendered overview | Passed |
| TC32 | Pending notification → recover through UI | Original payment unchanged; pending count zero; recovery action disabled when complete | Passed |
| TC33 | Separate tabs: different workspaces, navigation, date change and reload | Each tab retains its workspace and selected pay period; no cross-tab payroll substitution | Passed |

| TC34 | Read served build identity, then request the opposite implementation through workspace creation | ID/source fingerprint match the tested package; opposite implementation is rejected with HTTP 400 | Passed in both builds |

See [the expected faulty failure](evidence/faulty-run.log), [corrected run](evidence/fixed-run.log), [faulty process check](evidence/faulty-process.log), [fixed process check](evidence/fixed-process.log) and [JSON report](evidence/fixed-playwright.json) for actual execution output. Test counts describe checks, not a reviewer-assigned assessment score. Remaining integration and accessibility gaps are recorded in [release readiness](release-readiness.md).

For the central business outcome, start with the [generated before/after comparison](evidence/business-proof.md). TC10 asserts the same amount, preserved payment object and original message identity; a correction that deletes and recreates the payment cannot pass as safe recovery.

The faulty full run has five failing cases: TC10 (UI retry duplicates pay), TC11 (restart retry duplicates pay), TC13 (interruption leaves an orphan payment), TC14 (lost acknowledgement leaves a duplicate payment and a pending notification; simulated provider acceptance remains one), and TC16 (overlapping requests after delivery failure duplicate pay). Its other 29 checks pass. The fixed run passes all 34. These are execution results, not deliberately changed expectations or skipped tests.
