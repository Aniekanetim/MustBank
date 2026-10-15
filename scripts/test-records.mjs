import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

export async function writeTestRecords(pair, runs, environment) {
  const directory = resolve('assessment/test-records');
  await mkdir(directory, { recursive: true });
  const escape = text => String(text).replaceAll('|', '\\|').replaceAll('\n', '<br>');
  for (const variant of ['faulty', 'fixed']) {
    const run = runs[variant], build = pair.builds[variant];
    const reportBytes = await readFile(`assessment/evidence/${variant}-playwright.json`);
    const record = { application: 'MustPayroll', variant, generatedAt: new Date().toISOString(),
      buildId: build.buildId, archive: build.archive, archiveSha256: build.archiveSha256,
      manifestSha256: build.manifestSha256, sourceFingerprint: pair.sourceFingerprint,
      testSuiteSha256: pair.testSuiteSha256, environment, servedBuild: run.servedBuild,
      commands: { browserAndApi: `QUEST_BEHAVIOR=${variant} npx playwright test`, freshProcess: `PAYROLL_TEST_BUILD_DIR=${build.directory} node --test tests/service.test.mjs` },
      exitCodes: { playwright: run.playwrightExit, freshProcess: run.processExit },
      playwrightReportSha256: createHash('sha256').update(reportBytes).digest('hex'),
      total: run.cases.length, passed: run.cases.filter(c => c.result === 'passed').length,
      failed: run.cases.filter(c => c.result === 'failed').length, cases: run.cases,
      primaryObservation: { approvedMinor: run.state.expectedMinor, recordedMinor: run.state.paidMinor, payments: run.state.payments.length, pendingNotifications: run.state.pendingNotifications },
      freshProcessObservation: run.processObservation,
      relatedObservations: run.observations,
    };
    await writeFile(resolve(directory, `${variant}.json`), JSON.stringify(record, null, 2) + '\n');
    const decision = variant === 'faulty'
      ? 'BLOCK RELEASE. The original payment is duplicated after a notification failure. The persistence-interruption case also exposes a payment without durable notification work.'
      : 'PASS the assessed local reference scope. The original payment survives recovery, notification work is durable, and every check in the same suite passes. Production payroll approval is outside this result.';
    const text = `# ${variant === 'faulty' ? 'Before correction: faulty build' : 'After correction: fixed build'} test record\n\n` +
      `**${record.passed} passed; ${record.failed} failed; ${record.total} executed. ${decision}**\n\n` +
      `Build: ${record.buildId}. Tested on ${record.generatedAt} using ${environment.node} / Chromium ${environment.chromium} on ${environment.platform}. These are automated execution results, not a claim of candidate manual sign-off.\n\n` +
      `## Build and test identity\n\n` +
      `- Application: [download this build](../builds/MustPayroll-${variant}.zip); [runtime manifest](../builds/${variant}-manifest.json).\n` +
      `- Package SHA-256: ${record.archiveSha256}.\n` +
      `- Shared source fingerprint: ${record.sourceFingerprint}.\n` +
      `- Shared test-suite fingerprint: ${record.testSuiteSha256}. Both records execute the same cases and positive business expectations.\n` +
      `- The served-build attachment matches this build ID and source fingerprint. TC34 also verifies that its API cannot switch to the opposite implementation.\n\n` +
      `## Reproduction and observed result\n\n` +
      `Input: one approved earning of NGN150,000 for Amara Okafor in the 5–12 October 2026 UTC period. Inject one notification failure before provider acceptance, process payroll, then retry the same pay run. Expected: retain exactly one NGN150,000 payment and recover its original pending notification.\n\n` +
      `Observed after retry: NGN${(run.state.paidMinor / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}, ${run.state.payments.length} payment(s), ${run.state.pendingNotifications} pending notification(s). The same TC10 assertion ${variant === 'faulty' ? 'fails on the excess payment amount' : 'passes and verifies that the entire original payment object and notification ID are retained'}.\n\n` +
      `Watch the [actual TC10 browser recording](${variant}-TC10.webm), inspect the [final screenshot](../evidence/${variant}-reproduction.png), or read the [first attempt](../evidence/${variant}-first-attempt.json) and [state after retry](../evidence/${variant}-workspace.json). The browser recording is evidence from automation; the candidate's final Loom is a separate deliverable.\n\n` +
      `## Every executed case\n\n` +
      `Inputs and expected outcomes are in the [case register](../test-cases.md). Results below come from the Playwright report and the independent fresh-process check; no test is skipped or marked as an expected failure.\n\n` +
      `| Case | Check | Result | Failure observed |\n|---|---|---|---|\n` +
      run.cases.map(c => {
        const detail = c.result === 'passed' ? '—' : {
          TC10: 'Expected NGN150,000 and one payment; observed NGN300,000 and two payments.',
          TC11: `Expected one payment after restart; observed ${run.processObservation.afterRestart.payments.length} payments totaling NGN${run.processObservation.afterRestart.paidMinor / 100}.`,
          TC13: `Expected no committed payment after interruption; observed ${run.observations.TC13.payments.length} payment and ${run.observations.TC13.notifications.length} notifications.`,
          TC14: `Expected one payment and no pending notification; observed ${run.observations.TC14.payments.length} payments and ${run.observations.TC14.pendingNotifications} pending notification. Provider acceptances remain ${run.observations.TC14.providerAccepted}.`,
          TC16: `Expected NGN150,000 once; observed NGN${run.observations.TC16.paidMinor / 100} across ${run.observations.TC16.payments.length} payments.`,
        }[c.id] ?? c.error;
        return `| ${c.id} | ${escape(c.title)} | ${c.result.toUpperCase()} | ${escape(detail)} |`;
      }).join('\n') + '\n\n' +
      `## Execution records and handoff\n\n` +
      `- [Browser/API report](../evidence/${variant}-playwright.json), [console log](../evidence/${variant}-run.log).\n` +
      `- [Fresh-process console log](../evidence/${variant}-process.log), [before/restart state](../evidence/${variant}-process.json).\n` +
      `- Related observed states: [TC13 interrupted persistence](../evidence/${variant}-TC13.json), [TC14 lost acknowledgement](../evidence/${variant}-TC14.json), [TC16 overlapping requests](../evidence/${variant}-TC16.json).\n` +
      `- [Structured test record](${variant}.json), [comparison](README.md), [PAY-001 defect report](../defect-report.md).\n` +
      `- Reproduce both runs from source with npm ci, npx playwright install --no-shell chromium, then npm run verify. The verifier builds both packages, checks their hashes, executes the full suite against each, and regenerates both records. A failed corrected check or an unexpected faulty result fails verification.\n\n` +
      `No real funds, bank API or employee data were used. Browser coverage is Chromium. Single-server overlap is tested; distributed workers, real providers, permissions, taxes and statutory compliance are unverified.\n`;
    await writeFile(resolve(directory, `${variant}.md`), text);
  }
  await writeFile(resolve(directory, 'README.md'), `# Two builds, two test records\n\nThe faulty application preserves the defect. The fixed application contains its correction. Each package contains one payment implementation, has its own build ID and database, and runs without installing application dependencies.\n\n| Build | Executed test record | TC10 recording | Result |\n|---|---|---|---|\n` + ['faulty', 'fixed'].map(variant => {
    const c = runs[variant].cases;
    return `| [${variant} application](../builds/MustPayroll-${variant}.zip) | [${variant} record](${variant}.md) | [Browser video](${variant}-TC10.webm) | ${c.filter(x => x.result === 'passed').length} pass / ${c.filter(x => x.result === 'failed').length} fail |`;
  }).join('\n') + `\n\nThe same 34 checks run against both applications: 33 browser/API checks and one fresh-process persistence check. Business assertions are unchanged between runs. [Build identities](../builds/pair.json) and package hashes connect each result to the runnable artifact. [The correction patch](../builds/fix.patch) shows the change in payment policy.\n\nRead the [case register](../test-cases.md) for inputs and expectations, and [business proof](../evidence/business-proof.md) for the causal before/after comparison. Start either downloaded package with npm start on Node.js 22.13 or later, then follow its README.\n`);
}
