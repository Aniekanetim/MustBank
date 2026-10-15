# Review the two MustPayroll applications

These are separate, unpacked application folders. Each contains its own backend, payment implementation, compiled interface and package.json. No dependency installation or archive extraction is needed. Use Node.js 22.13 or later.

| Application | Folder | Default URL | Existing test record |
|---|---|---|---|
| Buggy | [buggy](buggy) | http://127.0.0.1:4175/overview | [Before correction](../assessment/test-records/faulty.md) |
| Fixed | [fixed](fixed) | http://127.0.0.1:4176/overview | [After correction](../assessment/test-records/fixed.md) |

Open a terminal in either folder and run:

~~~sh
npm start
~~~

To prepare the chosen failure, open another terminal in that same folder and run:

~~~sh
npm run scenario -- --fail-notification
~~~

Open the printed pay-run link, process payroll, then retry that pay run. The employee is owed NGN150,000. The buggy app records NGN300,000; the fixed app preserves the original NGN150,000 payment and recovers its notification.

The two folders have separate local databases. Their API cannot switch payment implementation. Compare buggy/server/payment-policy.mjs with fixed/server/payment-policy.mjs to inspect the exact difference. Both folders were copied from the tested runtime manifests without changing their application files. Their build IDs and file hashes match the existing execution records.

The shared editable frontend and backend source remain at the repository root. These two folders are the independent runnable applications built from that source. Their generated dist files are required to serve the interface; they are not orphaned code.

The old archives and generated folders are still present pending the candidate's approval of the cleanup proposal. Use these two folders for independent application review.
