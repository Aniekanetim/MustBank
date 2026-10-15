# Two builds, two test records

The faulty application preserves the defect. The fixed application contains its correction. Each package contains one payment implementation, has its own build ID and database, and runs without installing application dependencies.

| Build | Executed test record | TC10 recording | Result |
|---|---|---|---|
| [faulty application](../builds/MustPayroll-faulty.zip) | [faulty record](faulty.md) | [Browser video](faulty-TC10.webm) | 29 pass / 5 fail |
| [fixed application](../builds/MustPayroll-fixed.zip) | [fixed record](fixed.md) | [Browser video](fixed-TC10.webm) | 34 pass / 0 fail |

The same 34 checks run against both applications: 33 browser/API checks and one fresh-process persistence check. Business assertions are unchanged between runs. [Build identities](../builds/pair.json) and package hashes connect each result to the runnable artifact. [The correction patch](../builds/fix.patch) shows the change in payment policy.

Read the [case register](../test-cases.md) for inputs and expectations, and [business proof](../evidence/business-proof.md) for the causal before/after comparison. Start either downloaded package with npm start on Node.js 22.13 or later, then follow its README.
