# Why this problem

**The selected failure is a duplicate employee payment after a notification failure.** An employee has ₦150,000 of approved earnings. Payroll records the payment, but sending its confirmation fails. An operator retries the pay run. Faulty completion logic records another ₦150,000 payment, although nothing else is owed.

The business rule comes first: one employee receives one payment for the total approved earnings in one pay period. A message reports that payment; it cannot decide whether the payment exists. This makes a notification failure an effective test of payment recovery.

## Alternatives and priority

These are plausible failures in the defined local model. No production incident history or frequency data is available.

| Rank | Possible failure | User and operational impact | Likelihood or uncertainty | Effort |
|---|---|---|---|---|
| 1 | Retrying after notification failure records another employee payment | Employee-period total exceeds approved pay; operators must identify and reconcile the duplicate | Retries are a plausible response to partial failure; actual frequency is unknown | Medium: preserve payment identity, separate delivery and verify persistence |
| 2 | A timezone or cut-off error places earnings in the wrong period | Pay is missing, delayed or included too early; employee and payroll totals disagree | Boundary inputs are predictable; affected volume is unknown | Low to medium: explicit UTC rules and boundary fixtures |
| 3 | Notification is sent before a payment succeeds | Employee receives a confirmation unsupported by a payment record | Plausible if ordering is wrong; actual frequency is unknown | Low to medium: require committed payment before message work |
| 4 | Duplicate earning imports increase approved payroll | Payroll pays twice for one earning record | Imports and repeated requests are plausible; actual frequency is unknown | Low: stable earning IDs and transactional conflict rejection |

The first problem has the highest priority because recovery itself creates an incorrect financial record. The other problems remain in the regression scope to establish the correct amount, period and event order.

## Why a focused payroll application

Payroll gives the reviewer a continuous business journey: approved earnings, a pay period, employee payments, confirmation and recovery. MustPayroll exposes that journey without requiring unrelated bank transfers or account management. Employees can have several earning records, so the implementation must aggregate them and protect the employee-period payment, rather than merely rename the previous task-based rewards example.

The application is a local, inspectable project adapted from an MIT-licensed foundation. All names, amounts and destinations are synthetic. The defect is deliberately introduced for this investigation. It is not presented as an upstream discovery, live MUST behavior or an incident Aniekan handled at work.

## What the deliverables should communicate

The reader should understand **the rule, the failure, the cause, the prevention, the verification and the release decision**, in that order. [directive.md](directive.md) links each claim to the runnable project and evidence. AI assistance is disclosed; Aniekan's personal review and recorded explanation remain necessary for submission.
