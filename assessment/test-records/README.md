# Two builds, two test records

The buggy application preserves the defect. The fixed application contains its correction. Each is a separate plain folder with one payment implementation, its own build ID and its own database. Both run without installing application dependencies.

| Build | Executed test record | TC10 recording | Result |
|---|---|---|---|
| [buggy application folder](../../builds/buggy) | [faulty record](faulty.md) | [Browser video](faulty-TC10.webm) | 29 pass / 5 fail |
| [fixed application folder](../../builds/fixed) | [fixed record](fixed.md) | [Browser video](fixed-TC10.webm) | 34 pass / 0 fail |

The same 34 checks run against both applications: 33 browser/API checks and one fresh-process persistence check. Business assertions are unchanged between runs. [Build identities](../builds/pair.json) and runtime file hashes connect each result to the runnable folder. [The correction patch](../builds/fix.patch) shows the change in payment policy.

Read the [case register](../test-cases.md) for inputs and expectations, and [business proof](../evidence/business-proof.md) for the causal before/after comparison. Start either folder with npm start on Node.js 22.13 or later, then follow its README.
