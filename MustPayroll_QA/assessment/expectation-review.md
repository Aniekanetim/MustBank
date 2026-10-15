# Quest expectations and the payroll deliverables

The supplied **Quest Expectation - Full Transcript.txt is the working source of truth**, as directed by Aniekan. Its earlier project example is replaced by MustPayroll. The central demonstration stays the same: build the faulty system, run a test that exposes its failure, correct the system, and run the same test again to establish the fix.

The earlier setup put two behaviours inside one application and ran only the central regression against the faulty behaviour. Aniekan identified the gap. The revised delivery contains **two independently runnable application builds and two full execution records**. Each app folder has one payment implementation and its own database; a workspace cannot switch the implementation.

## What the reviewer receives

| Deliverable | Evidence |
|---|---|
| Application containing the defects | [Buggy application folder](../../MustBank/Mustpayroll_buggy), [manifest](builds/faulty-manifest.json) |
| Application containing the correction | [Fixed application folder](../../MustBank/MustPayroll_fixed), [manifest](builds/fixed-manifest.json) |
| Test record proving the defects | [Faulty full-suite record](../executions/buggy/README.md), raw reports, logs, build identity and observed state linked within |
| Test record proving the correction | [Fixed full-suite record](../executions/fixed/README.md), raw reports, logs, build identity and observed state linked within |
| Same test expectations before and after | Matching test-suite fingerprint in both records; 34 identical checks; no skips or expected-failure annotations |
| Exact correction and artifact identity | [Payment-policy patch](builds/fix.patch), [build pair and runtime file hashes](builds/pair.json) |

## Requirement-to-evidence map

| Expectation from the transcript | Implementation or evidence |
|---|---|
| Choose a consequential business failure and compare alternatives | [Intent](intent.md): four plausible failures ranked by consequence, plausible trigger and effort; production frequency remains unknown |
| Explain who is owed what, when and why | [Payroll rules](business-rules.md): approved earnings aggregated once per employee and UTC period |
| Map input, decisions, payment, notification and recovery | Explicit [flow and decision map](business-rules.md#decision-flow) |
| At least eight cases with concrete inputs and expectations | [34-case register](test-cases.md): normal flow, cut-off, timezone, duplicates, retry, partial failure, persistence and user journeys |
| A reproducible fixture with durable state and controlled failures | Synthetic employee/earnings fixtures, SQLite, one-shot failure injection outside the product UI |
| Faulty build first, fixed build second, same test before/after | Two independent application folders and two execution records above; same NGN150,000 expectation in both |
| Show the business effect of the failure | Faulty retry records NGN300,000 for one approved NGN150,000 employee-period; fixed retry retains the original payment and recovers notification |
| Root cause and actionable defect report | [PAY-001](defect-report.md), evidence and proposed correction; the faulty notification marker incorrectly decides payment completion |
| Prevent recurrence with a release gate | npm run verify checks the full faulty failure set and every fixed check, build identity and artifact hashes |
| Demonstrate the final run and retain proof | Two records, JSON reports, state snapshots and logs; screenshots and browser videos are optional supporting formats |
| Operational recovery and release handoff | [Runbook](operations-runbook.md), [release checklist and known limits](release-readiness.md) |
| Explain AI delegation and human accountability | [Activity record](ai-accountability.md) includes Aniekan's correction of the deliverable interpretation; [personal review](personal-review.md) records unconfirmed execution/sign-off honestly |
| intent.md and final directive.md | [Intent](intent.md), [directive with results/handoff links](directive.md) |
| Accessible work for independent review | Public repository with editable source and both independent app folders; [anonymous access check](evidence/reviewer-access.json) |
| A candidate Loom no longer than five minutes | [Recording script](loom-script.md) prepared; final candidate-owned video still pending. Automated test recordings do not replace it |

## Boundaries and remaining work

Payroll replaces the transcript's old banking/rewards project example. The implemented model pays approved project earnings; it does not claim a complete HR system, real bank integration, taxes or statutory compliance. Recovery is an explicit operator action. No background worker or automatic scheduling is claimed. These limits are visible in the release decision and handoff.

The transcript includes illustrative incidents, candidate experiences and suggested outcomes. They are useful prompts for reasoning; they are not evidence that those events occurred in this project or in Aniekan's employment. No incident history, support reduction, actual financial loss or personal test execution has been invented.

Aniekan reports reviewing the application. Specific manual checks, the final release judgment and the final Loom still need to be recorded by the candidate. The form reportedly contains conditional fields; verify its actual repository/upload field and any deadline/timezone, rubric or compensation terms when displayed. Genuine portfolio cases, if required by the wider application, need candidate facts and remain separate from this synthetic exercise.

## Source snapshots reviewed locally

| Source | SHA-256 |
|---|---|
| Quest Expectation - Full Transcript.txt | 11b621cb5df09dd34ff02009dd17c98f6d6a8149ba29e345efdb0ea3fa9da68d |
| AI-Native Product QA Engineer (Business Flows & Operational Quality) at MUST Company.mhtml | a13199f650ed42d918ded39e00a83f4790d01787091d077ba7396aca21cb25da |

The raw source files remain outside the public application folders. Their hashes identify the reviewed snapshots without publishing personal local paths or the candidate's CV.

## Evidence format and application independence

The [original-source review](evidence-requirements.md) distinguishes required verification evidence from optional screenshots and automation recordings. Current reports, logs, observed state and exact build identities provide the evidence. Older media retains its original run identity. The candidate Loom remains required.

Both applications now own their complete source and build tooling under MustBank; all test design, execution scripts, results and assessment documents are outside it in MustPayroll_QA. The [standalone check](evidence/independence.json) exercises each copied application without its sibling or QA files.
