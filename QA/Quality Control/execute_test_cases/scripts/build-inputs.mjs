export const TEST_FILES = [
  'test/helpers.ts',
  'test/specs/payroll-api.spec.ts',
  'test/specs/payroll-ui.spec.ts',
  ...['payroll', 'pay-runs', 'earnings', 'payments', 'payment-receipt', 'employees', 'notifications']
    .map(name => `test/pages/${name}-page.ts`),
  'test/service.test.mjs',
  'scripts/process-probe.mjs',
  'playwright.config.ts',
  '../test_cases/catalog.json',
];
export const SOURCE_FILES = [
  'package.json', 'package-lock.json', 'tsconfig.json',
  'scripts/build-inputs.mjs', 'scripts/build-pair.mjs', 'scripts/scenario.mjs',
  'scripts/verify.mjs', 'scripts/test-records.mjs', 'scripts/test-suite.mjs',
  ...TEST_FILES,
];
export const APPLICATIONS = { faulty: '../../../MustBank/Mustpayroll_buggy', fixed: '../../../MustBank/MustPayroll_fixed' };
