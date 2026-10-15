# Review the independent applications

| Application | Complete project | Local URL |
|---|---|---|
| Buggy | [Mustpayroll_buggy](../MustBank/Mustpayroll_buggy) | http://127.0.0.1:4175/overview |
| Fixed | [MustPayroll_fixed](../MustBank/MustPayroll_fixed) | http://127.0.0.1:4176/overview |

Open a terminal in either application folder and run npm start. Each includes its own compiled interface, editable frontend, backend, payment policy, package.json, dependency lockfile and build commands. Starting requires Node.js 22.13 or later and no dependency installation. Each writes to its own data/payroll.sqlite.

To rebuild one application, run npm ci and npm run build inside that application. It can be rebuilt or copied and started without the other app or the QA project. The automated [standalone check](assessment/evidence/independence.json) copies only that application's files into an isolated temporary folder and verifies serving and payroll behavior.

Test cases, execution scripts, fixtures, results, reports and assessment documents live in MustPayroll_QA, outside MustBank. To prepare the defect demonstration, start the apps and follow the scenario commands in [SETUP.md](SETUP.md) from that QA folder. The app folders contain no test suites or test results.

The [buggy test record](executions/buggy/README.md) and [fixed test record](executions/fixed/README.md) identify the exact application IDs and hashes. Compare the two server/payment-policy.mjs files or the [policy patch](assessment/builds/fix.patch) for the correction. The applications each contain one implementation and reject behavior-switching requests.
