const execution = 'Quality Control/execute_test_cases';
export const TEST_FILES = [
  `${execution}/test/helpers.ts`,
  `${execution}/test/specs/payroll-api.spec.ts`,
  `${execution}/test/specs/payroll-ui.spec.ts`,
  ...['payroll', 'pay-runs', 'earnings', 'payments', 'payment-receipt', 'employees', 'notifications']
    .map(name => `${execution}/test/pages/${name}-page.ts`),
  `${execution}/test/service.test.mjs`,
  `${execution}/scripts/process-probe.mjs`,
  `${execution}/playwright.config.ts`,
  'Quality Control/test_cases/catalog.json',
];
export const SOURCE_FILES = ['package.json', 'package-lock.json', 'tsconfig.json', 'scripts/build-inputs.mjs', 'scripts/build-pair.mjs', 'scripts/start-build.mjs', 'scripts/scenario.mjs', 'Quality Control/execute_test_cases/scripts/verify.mjs', 'Quality Control/execute_test_cases/scripts/test-records.mjs', 'Quality Control/execute_test_cases/scripts/test-suite.mjs', ...TEST_FILES];
export const APPLICATIONS = { faulty: '../MustBank/Mustpayroll_buggy', fixed: '../MustBank/MustPayroll_fixed' };
