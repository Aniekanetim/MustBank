import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { writeTestDesign, writeExecutedTables, observedResult } from './test-suite.mjs';

export async function writeTestRecords(pair, runs, environment) {
  const catalogue = await writeTestDesign();
  const resultsDirectory = resolve('Quality Control/execute_test_cases/results');
  const link = (from, target) => relative(from, resolve(target)).replaceAll('\\', '/').split('/').map(encodeURIComponent).join('/');
  const counts = cases => ({ total: cases.length, passed: cases.filter(c => c.result === 'passed').length, failed: cases.filter(c => c.result === 'failed').length });
  for (const variant of ['faulty', 'fixed']) {
    const run = runs[variant], build = pair.builds[variant], directory = resolve(build.executionDirectory);
    await mkdir(directory, { recursive: true });
    const record = { application: 'MustPayroll', variant, generatedAt: new Date().toISOString(),
      buildId: build.buildId, directory: build.directory, executionDirectory: build.executionDirectory,
      sourceFingerprint: build.sourceFingerprint, testSuiteSha256: pair.testSuiteSha256,
      environment, testedUrl: 'http://127.0.0.1:4184', servedBuild: run.servedBuild,
      command: 'npm run verify', exitCodes: { playwright: run.playwrightExit, freshProcess: run.processExit },
      playwrightReportSha256: createHash('sha256').update(await readFile(resolve(directory, 'playwright/report.json'))).digest('hex'),
      ...counts(run.cases), playwright: counts(run.cases.filter(c => c.id !== 'TC11')),
      freshProcess: counts(run.cases.filter(c => c.id === 'TC11')), core: counts(run.cases.filter(c => catalogue.coreIds.includes(c.id))),
      cases: run.cases.map(result => ({ ...result, framework: catalogue.cases.find(c => c.id === result.id).framework, actual: observedResult(run, catalogue.cases.find(c => c.id === result.id)) })),
    };
    await writeFile(resolve(directory, 'run.json'), JSON.stringify(record, null, 2)+'\n');
    await writeExecutedTables(build, run, catalogue);
    const title = variant === 'faulty' ? 'Buggy' : 'Fixed';
    const app = relative(directory, resolve(build.directory)).replaceAll('\\', '/');
    await writeFile(resolve(directory, 'README.md'), `# ${title} build test execution\n\n` +
      `**${record.passed} passed, ${record.failed} failed, ${record.total} executed.**\n\n` +
      `| Scope | Total | Passed | Failed |\n|---|---|---|---|\n| Playwright browser/API | ${record.playwright.total} | ${record.playwright.passed} | ${record.playwright.failed} |\n| Node fresh-process check | 1 | ${record.freshProcess.passed} | ${record.freshProcess.failed} |\n| Eight core cases, included above | 8 | ${record.core.passed} | ${record.core.failed} |\n\n` +
      `## Cases and actual results\n\n- [Eight completed core cases](core-results.csv).\n- [All 34 completed cases](test-results.csv).\n- [Shared case definitions](${link(directory, 'Quality Control/test_cases/payroll-test-suite.csv')}).\n\n` +
      `## Execution environment\n\nApplication: [${title.toLowerCase()} build](${app}). Build version: ${record.buildId}. Executed: ${record.generatedAt}. Node ${environment.node}, Chromium ${environment.chromium}, ${environment.platform}/${environment.architecture}. The isolated test URL was http://127.0.0.1:4184. The normal application port is ${build.port}.\n\n` +
      `## Execution evidence\n\n- [Playwright results](playwright/report.json) and [execution log](playwright/console.log).\n- [Fresh-process execution log](process/console.log) and [before/restart result](process/observation.json).\n- [First payment attempt](evidence/first-attempt.json) and [state after retry](evidence/workspace.json).\n- Related failure checks: [TC13](evidence/TC13.json), [TC14](evidence/TC14.json), [TC16](evidence/TC16.json).\n- [Served application version](evidence/served-build.json) and [structured test record](run.json).\n\n` +
      `The employee is owed NGN150,000. After notification failure and payroll retry, this build records NGN${(run.state.paidMinor / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} across ${run.state.payments.length} payment(s), with ${run.state.pendingNotifications} pending notification(s). The expectation is unchanged between builds.\n\n` +
      `From QA, npm run verify rebuilds the apps and repeats the same suite against both. Results are automated; they do not claim candidate manual sign-off. See [execution comparison](../README.md), [defect report](${link(directory, 'Quality Control/bug_report/PAY-001.md')}) and [release checklist](${link(directory, 'Quality assurance/release_readiness/README.md')}).\n`);
  }
  await writeFile('Quality Control/execute_test_cases/results/README.md', '# Payroll test execution results\n\nThe same eight core cases and full 34-check suite run against each application. IDs, inputs, steps and expected results stay unchanged.\n\n| Build | Eight completed cases | All completed cases | Execution record | Total result |\n|---|---|---|---|---|\n' + ['faulty','fixed'].map(variant => {
    const folder = variant === 'faulty' ? 'buggy' : 'fixed', result = counts(runs[variant].cases);
    return `| [${folder} app](${relative(resolve('Quality Control/execute_test_cases/results'), resolve(pair.builds[variant].directory)).replaceAll('\\', '/')}) | [Eight cases](${folder}/core-results.csv) | [All 34](${folder}/test-results.csv) | [Logs and actual results](${folder}/README.md) | ${result.passed} passed / ${result.failed} failed |`;
  }).join('\n')+`\n\nRead the [defect report](${link(resultsDirectory, 'Quality Control/bug_report/PAY-001.md')}) and [release checklist](${link(resultsDirectory, 'Quality assurance/release_readiness/README.md')}) for the meaning of these outcomes.\n`);
}
