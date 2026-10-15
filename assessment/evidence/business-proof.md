# What happens when payroll recovery is retried?

**The employee is owed ₦150,000.00. The faulty retry records ₦300,000.00; the correction retains the original ₦150,000.00 payment.**

Generated from the actual TC10 attachments by scripts/report-evidence.mjs. It rejects mismatched inputs, an incorrect failure, changed payment identity or an unrecovered corrected message. Run timestamp: 2026-10-15T17:57:25.109Z.

| Observed stage | Approved pay | Recorded pay | Payments | Pending notifications |
|---|---|---|---|---|
| Faulty: first attempt | ₦150,000.00 | ₦150,000.00 | 1 | 1 |
| Faulty: retry | ₦150,000.00 | ₦300,000.00 | 2 | 1 |
| Corrected: first attempt | ₦150,000.00 | ₦150,000.00 | 1 | 1 |
| Corrected: retry | ₦150,000.00 | ₦150,000.00 | 1 | 0 |

The first attempts have identical earning inputs. Payment commits before notification is attempted. The injected notification failure occurs before provider acceptance, leaving one successful payment and one pending message in each implementation.

On retry, the faulty version creates a different payment ID for the same employee and period. The original payment still exists, so recorded pay exceeds approved pay by ₦150,000.00. This is observed excess in a synthetic ledger, not actual financial loss.

The corrected retry preserves the complete original payment object and recovers the original message. Its payment reference is ee6a48d2-5990-42eb-9cd9-6f7785833690. Message state changes from pending to sent, with one simulated provider acceptance.

## Check the evidence

- First attempts: [faulty](../../qa/executions/buggy/evidence/first-attempt.json), [corrected](../../qa/executions/fixed/evidence/first-attempt.json).
- After retry: [faulty](../../qa/executions/buggy/evidence/workspace.json), [corrected](../../qa/executions/fixed/evidence/workspace.json).
- Machine-readable comparison: [business proof](business-proof.json).
- Same assertion: [expected failure](../../qa/executions/buggy/playwright/console.log), [corrected suite](../../qa/executions/fixed/playwright/console.log).
- Independent persistence checks: [faulty](../../qa/executions/buggy/process/console.log), [fixed](../../qa/executions/fixed/process/console.log).
- Other business boundaries: [case register](../test-cases.md), [environment and source fingerprints](summary.json).

## What this establishes

The correction prevents the selected duplicate-payment failure in the assessed fixtures and gives an operator a recovery path through the product. No manual database edit is required for the verified recovery. A failing corrected regression blocks this reference release.

This does not establish real bank movement, inbox delivery, distributed-worker safety or fewer production support tickets. There is no production baseline. [Operational follow-up](../operations-runbook.md) defines the evidence to collect and when to stop processing.
