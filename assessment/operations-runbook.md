# Recover payroll without creating another payment

Start with the employee and original pay period. A missing message does not prove that payment failed. Check the payment record before choosing a recovery action.

## Decide from recorded state

| What is recorded? | Product action | What must remain true? | Stop or escalate when |
|---|---|---|---|
| One payment equals approved pay; notification pending | Open Notifications and retry pending delivery | Same payment reference and amount; existing message becomes sent | Pending state persists after retry, or payment changes |
| No payment for an approved employee in a locked run | Open the original pay date, review totals and retry the pay run | Only unpaid entries get payments; previously successful entries remain unchanged | A destination is disputed, totals disagree or recovery creates a duplicate |
| All expected payments exist; messages sent | Open the receipt and confirm the original reference | No additional payment is created | A reported problem concerns real bank receipt; this demo cannot verify that |
| More than one payment per employee-period, or recorded pay differs from approved pay | Stop processing that workspace/period; preserve evidence | No further payout action while investigating | Escalate to the engineering/QA owner for reconciliation; do not use message retry as a payment reversal |
| Pending approvals or empty approved payroll | Return to Earnings and resolve eligibility before processing | No run/payment is created from incomplete approval | The proposed earning date belongs to a locked period; agree an adjustment in a later open period |

The roles below are proposed handoff responsibilities, not claims about MUST's team structure. Operations checks state and selects the documented action. Engineering investigates incorrect ledger state. QA checks the rule and regression evidence before recommending release of a correction.

## Verify recovery

1. Open the original pay date, not the calendar date of the retry. Note the employee, approved amount, recorded amount and payment reference.
2. Use the action from the table. Notification-only recovery is preferable when the payment already exists.
3. Reopen the receipt. Compare the reference, employee, period, amount and destination with the original record.
4. Check notification state separately. In this demo, sent means the simulated provider acknowledged acceptance; it does not prove receipt by a real employee.
5. If the expected state is not restored, retain the evidence and escalate. Do not repeatedly rerun payroll to investigate an unexplained mismatch. Do not manually edit the database to make the check pass.

The corrected flow also tolerates retrying the original pay run after notification failure. [TC10](evidence/business-proof.md) proves that broader recovery path preserves the original payment and recovers the existing message. There is no background recovery worker in the assessed application.

## Handoff a support question

Record the synthetic workspace ID, employee ID, original pay date/UTC period, approved amount, payment reference/count/amount, notification state and attempts, observed error, attempted action and result. Link the relevant receipt or exported records and event evidence. Exclude credentials and real personal data.

Example summary: “The employee has one recorded ₦150,000 payment for the 13 October run. Notification was pending after a delivery error. Retrying notification retained the original payment reference and changed delivery state to sent. Bank movement and inbox receipt were not tested.” Replace this with actual observations; it is not a completed production ticket.

## Judge operational impact honestly

The local evidence demonstrates prevention of ₦150,000 of excess recorded pay in the selected fixture and recovery through product controls without an engineering database edit. It does not establish real money saved or fewer support tickets.

For a real rollout, first establish a baseline of support requests grouped by flow and root cause. Then compare duplicate-payment incidents per pay run, repeated requests for the same cause, message-recovery success and engineering interventions over comparable periods. Record affected volume and observation windows; do not claim reduction without those measurements. Persistent notification failures and account-change policies require additional requirements and tests before a production rollout.
