# Quest expectation review

The payroll investigation already reproduces a high-impact payout failure and verifies its correction. This review strengthens the explanation, operational handoff, evidence trail and ownership record. It does not expand the application into a full payroll or HR platform.

## Which source establishes the requirement?

The employer's saved role page establishes the Quest requirements. The supplied discussion transcript is commentary about those requirements and our earlier planning. Where they differ, the original brief takes precedence. The full weighted rubric and invitation terms have not been supplied.

Locally reviewed source snapshots, identified without publishing their contents or local computer paths:

| Source | SHA-256 |
|---|---|
| AI-Native Product QA Engineer (Business Flows & Operational Quality) at MUST Company.mhtml | a13199f650ed42d918ded39e00a83f4790d01787091d077ba7396aca21cb25da |
| Quest Expectation - Full Transcript.txt | 11b621cb5df09dd34ff02009dd17c98f6d6a8149ba29e345efdb0ea3fa9da68d |

## Coverage and gaps

| Expectation | Position after this review | Evidence or next action |
|---|---|---|
| Rank at least three failures by impact, likelihood and effort | Covered; uncertainty explicit | [Intent](intent.md) ranks four plausible failures without incident claims |
| Define who earns what, when and why | Covered for approved project earnings | [Payroll rules](business-rules.md); taxes and deductions excluded |
| Map qualifying inputs, decisions, payment, notification and recovery | Strengthened with an explicit decision flow and recovery table | [Flow map](business-rules.md#decision-flow) |
| Cover at least eight cases, including boundaries, timezone, duplicates, retry and partial failure | Covered; named cases map to business conditions | [Case register](test-cases.md), TC01–TC22 |
| Same expectation fails before correction and passes afterwards | Covered; original payment and message identities also protected | TC10 and [generated business proof](evidence/business-proof.md) |
| Persistence and failure injection support the chosen model | Covered by implementation choices | SQLite, one-shot faults, rollback and fresh-process TC11/TC13; not universal technology mandates |
| Actionable defect, severity, cause, evidence and proposed fix | Covered; readable causal evidence added | [PAY-001](defect-report.md), [observed before/after state](evidence/business-proof.json) |
| Prevent recurrence through a release gate | Covered within assessed scope | npm run verify requires the intended faulty failure and all corrected checks to pass |
| Operational recovery reduces dependence on engineering workarounds | Handoff strengthened | [Recovery runbook](operations-runbook.md); verified recovery uses product actions, not database edits |
| Communicate business impact rather than only test counts | Strengthened | Proof leads with duplicate pay and retained payment identity; support reduction is unmeasured |
| Show AI delegation and personal accountability | Concrete activity split prepared; candidate reports application review in progress; specific checks/sign-off unconfirmed | [AI accountability](ai-accountability.md), [personal review](personal-review.md) |
| Required intent.md and final directive.md link supporting work | Covered | [Intent](intent.md), [directive and handoff](directive.md) |
| Reviewer can access the work without local paths | Public links supplied; anonymous checks recorded separately | [Access report](evidence/reviewer-access.json); npm run reviewer:access |
| Loom no longer than five minutes | Script and rehearsal plan prepared; candidate recording still required | [Loom script](loom-script.md); add final URL and verify access/duration |
| Two to four genuine past cases in the broader application | Still requires candidate facts; separate from this fictional Quest | Private intake worksheet prepared outside the public repository |
| Exact deadline/timezone, submission channel and compensation terms | Exact terms still unconfirmed; candidate found conditional form fields and expects a repository-link field | Verify the actual field and invitation terms before submission; no additional recruiter message is assumed necessary |
| Final weighted score | Cannot self-assign | 76/100 is the pass threshold; only the reviewer evaluates the supplied rubric |

## Claims in the discussion that should not enter the submission

- AcmeBank, a previous Python project, SQLite and Playwright are discussed as if the employer selected them. The original Quest permits a local demo, open-source sample or sanitized project. It requires a minimal fixture and automated checks; it does not mandate these specific technologies. MustPayroll is an explicitly defined alternative flow.
- Automatic retries and a background scheduler are useful operational options, not explicit requirements in the supplied Quest. This reference uses operator-triggered recovery through the product. It proves payment preservation and message recovery, not autonomous scheduling. Adding an unverified worker would not close a mandatory requirement.
- The transcript speculates about past candidates, hiring-manager motives, deliberate missing logistics, near-zero support tickets and mathematically guaranteed stability. Those claims are not established by the saved brief. No production ticket baseline or universal guarantee is claimed here.
- Its example of a candidate correcting an AI-generated boundary operator is illustrative. It is not something Aniekan has confirmed doing in this project and must not be presented as personal experience.
- The five-minute limit applies to the recording. The absent invitation deadline does not imply unlimited preparation time.

The remaining submission blockers are personal review, the final Loom and missing invitation details. Additional genuine portfolio cases belong to the broader application. None should be marked complete by an automated test result.
