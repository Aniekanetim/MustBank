# MustPayroll interface verification

The interface now follows one payroll-operations journey. Employees establish the destination; Earnings establishes the approved amount and earning date; Pay runs establishes the period and asks for confirmation; Payments preserves the record; Notifications recovers delivery separately.

## Verified behavior

| Journey or design concern | Evidence |
|---|---|
| Overview distinguishes approved payroll, recorded pay, pending approvals and pending notifications | [Overview screenshot](evidence/payroll-overview.png), TC27 and TC31 |
| Employee directory leads to a masked destination and employee-specific earning entry | [Employee screenshot](evidence/payroll-employees.png), TC30 |
| Record → approve → review → confirm reaches the expected payroll amount | [Pay-run screenshot](evidence/payroll-pay-run.png), TC23 |
| Processing is a deliberate confirmed action; Escape restores focus without changing the ledger | TC24 and TC29 |
| Payment receipt is retrievable after reload, with copy and download actions | [Receipt screenshot](evidence/payroll-receipt.png), TC25 |
| Payment filters and exports agree | TC26 |
| Failed delivery is visible without calling the payment failed | [Pending notification screenshot](evidence/payroll-notification-pending.png), TC32 |
| Duplicate-payment behavior is surfaced as a mismatch requiring reconciliation | [Faulty screenshot](evidence/faulty-reproduction.png), TC10 |
| At 320px, payroll entries use stacked cards with visible approved/recorded totals and persistent navigation | [Mobile screenshot](evidence/payroll-mobile.png), TC28 |
| Keyboard skip link, title focus, dialog order and restoration work | TC29 |
| Separate browser tabs retain their workspace and pay period after navigation and reload | TC33 |

The application retains the established navy, white and teal design language, with native controls, consistent labels, restrained motion and reduced-motion handling. Status labels use text in addition to color. Fault preparation and implementation selection remain outside the product UI. The current rendered overview contains no old banking or assessment labels.

Screenshots were inspected at desktop and mobile sizes. This review is bounded to the implemented local workflow and automated Chromium checks. Real users, other browser engines, real mobile devices, screen readers, and full accessibility conformance remain unverified. No claim of a perfect usability grade is made.
