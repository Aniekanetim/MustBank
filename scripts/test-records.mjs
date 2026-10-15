import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { writeTestDesign, writeExecutedTables, observedResult } from './test-suite.mjs';

export async function writeTestRecords(pair, runs, environment) {
  const catalogue = await writeTestDesign();
  const catalogueSha256 = createHash('sha256').update(await readFile('qa/test-cases/catalog.json')).digest('hex');
  for (const variant of ['faulty', 'fixed']) {
    const run = runs[variant], build = pair.builds[variant], directory = resolve(build.executionDirectory);
    await mkdir(directory, { recursive: true });
    const core = run.cases.filter(c => catalogue.coreIds.includes(c.id));
    const playwright = run.cases.filter(c => c.id !== 'TC11');
    const counts = cases => ({ total: cases.length, passed: cases.filter(c => c.result === 'passed').length, failed: cases.filter(c => c.result === 'failed').length });
    const reportBytes = await readFile(resolve(directory, 'playwright/report.json'));
    const record = { application: 'MustPayroll', variant, generatedAt: new Date().toISOString(),
      buildId: build.buildId, directory: build.directory, executionDirectory: build.executionDirectory,
      runtimeSha256: build.runtimeSha256, manifestSha256: build.manifestSha256,
      sourceFingerprint: pair.sourceFingerprint, testSuiteSha256: pair.testSuiteSha256, catalogueSha256, environment,
      testedUrl: 'http://127.0.0.1:4184', servedBuild: run.servedBuild,
      commands: { completeVerification: 'npm run verify', browserAndApi: `QUEST_BEHAVIOR=${variant} npx playwright test`, freshProcess: `PAYROLL_TEST_BUILD_DIR=${build.directory} node --test tests/service.test.mjs` },
      exitCodes: { playwright: run.playwrightExit, freshProcess: run.processExit },
      playwrightReportSha256: createHash('sha256').update(reportBytes).digest('hex'),
      ...counts(run.cases), playwright: counts(playwright), freshProcess: counts(run.cases.filter(c => c.id === 'TC11')), core: counts(core),
      cases: run.cases.map(result => { const definition = catalogue.cases.find(c => c.id === result.id); return { ...result, framework: definition.framework, actual: observedResult(run, definition) }; }),
      primaryObservation: { approvedMinor: run.state.expectedMinor, recordedMinor: run.state.paidMinor, payments: run.state.payments.length, pendingNotifications: run.state.pendingNotifications },
    };
    await writeFile(resolve(directory, 'run.json'), JSON.stringify(record, null, 2) + '\n');
    await writeExecutedTables(build, run, catalogue);
    const decision = variant === 'faulty' ? 'BLOCK RELEASE: retry records another employee payment; persistence interruption also leaves an orphan payment.' : 'PASS the assessed local reference scope; production payroll approval remains outside this evidence.';
    const text = `# ${variant === 'faulty' ? 'Buggy' : 'Fixed'} build execution\n\n**${record.passed} passed, ${record.failed} failed, ${record.total} executed. ${decision}**\n\n` +
      `| Execution scope | Total | Passed | Failed |\n|---|---|---|---|\n| Playwright browser/API | ${record.playwright.total} | ${record.playwright.passed} | ${record.playwright.failed} |\n| Node fresh-process recovery | 1 | ${record.freshProcess.passed} | ${record.freshProcess.failed} |\n| Eight core assessment cases (subset) | 8 | ${record.core.passed} | ${record.core.failed} |\n\n` +
      `## Suite tables\n\n- [Eight core cases with actual results](core-results.csv).\n- [All 34 cases with steps, data, expectations, actual results and status](test-results.csv).\n- [Shared test design](../../test-cases/payroll-test-suite.csv), [core design](../../test-cases/core-payroll-regression.csv).\n\n` +
      `## Exact build and environment\n\nBuild: ${record.buildId}. Application folder: [${record.directory}](../../../${record.directory}). Execution time: ${record.generatedAt}. Runtime: ${environment.node}, Chromium ${environment.chromium}, ${environment.platform}/${environment.architecture}.\n\n` +
      `The isolated automated server used http://127.0.0.1:4184. The manual app's default port is ${build.port}. The [served-build evidence](evidence/served-build.json) matches this build ID and source fingerprint; TC34 verifies the opposite implementation is rejected. Application runtime SHA-256: ${record.runtimeSha256}. Shared test-suite SHA-256: ${record.testSuiteSha256}. Case-design SHA-256: ${catalogueSha256}.\n\n` +
      `## Open the Playwright execution\n\nFrom the repository root:\n\n~~~sh\nnpx playwright show-report ${build.executionDirectory}/playwright/html-report\n~~~\n\n` +
      `- [HTML report](playwright/html-report/index.html), [raw JSON report](playwright/report.json), [console log](playwright/console.log).\n- [Per-test traces, videos and screenshots](playwright/artifacts).\n- [PAY-001 browser recording](evidence/PAY-001.webm), [final screenshot](evidence/reproduction.png).\n- [First attempt](evidence/first-attempt.json), [after retry](evidence/workspace.json).\n- Related states: [TC13 interruption](evidence/TC13.json), [TC14 lost acknowledgement](evidence/TC14.json), [TC16 overlapping requests](evidence/TC16.json).\n- The separate Node check has its own [console log](process/console.log) and [before/restart state](process/observation.json).\n\n` +
      `HTML reports and bulk per-test artifacts are generated locally and retained in CI artifacts. CSV results, raw JSON, logs and the selected regression evidence are committed with this record. The CI artifact contains the same execution-folder structure.\n\n` +
      `## Business outcome and handoff\n\nOne approved earning owes Amara NGN150,000. After a one-shot notification failure and a retry, this build records NGN${(run.state.paidMinor / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} across ${run.state.payments.length} payment(s), with ${run.state.pendingNotifications} pending notification(s). The expectation remains one original payment and recovered delivery in both executions.\n\n` +
      `Run npm run verify to rebuild both folders and execute the same suite against each. No skips, timeouts or retries are accepted as business-defect proof. See [comparison](../README.md), [PAY-001](../../../assessment/defect-report.md) and [release decision](../../../assessment/release-readiness.md). Results are automated, not a claim of candidate manual sign-off. All employees, payment records and provider responses are synthetic.\n`;
    await writeFile(resolve(directory, 'README.md'), text);
  }
  await writeFile('qa/executions/README.md', '# Payroll execution comparison\n\nThe same suite, case IDs and positive business expectations run against two independent application folders.\n\n| Build | Execution folder | Eight-case result sheet | Full result sheet | Total outcome |\n|---|---|---|---|---|\n' + ['faulty', 'fixed'].map(variant => {
    const folder = variant === 'faulty' ? 'buggy' : 'fixed', cases = runs[variant].cases;
    return `| [${folder} app](../../builds/${folder}) | [${folder} execution](${folder}/README.md) | [Core eight](${folder}/core-results.csv) | [All 34](${folder}/test-results.csv) | ${cases.filter(c => c.result === 'passed').length} pass / ${cases.filter(c => c.result === 'failed').length} fail |`;
  }).join('\n') + '\n\nEach execution contains its Playwright HTML/JSON reports, console log, per-test artifacts, curated evidence, a separate Node fresh-process result, build identity and standard result tables. The eight-case subset is included in the 34 checks. Read [QA project organization](../README.md) and [business proof](../../assessment/evidence/business-proof.md).\n');
}
