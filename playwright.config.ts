import { defineConfig } from '@playwright/test';
import { readFileSync } from 'node:fs';
const mode = process.env.QUEST_BEHAVIOR === 'faulty' ? 'faulty' : 'fixed';
const pair = JSON.parse(readFileSync('assessment/builds/pair.json', 'utf8'));
const build = pair.builds[mode];

export default defineConfig({
  testDir: './tests', testMatch: '**/*.spec.ts', fullyParallel: true,
  workers: 2, retries: 0, timeout: 30000,
  outputDir: `output/playwright/${mode}`,
  reporter: [['line'], ['json', { outputFile: `assessment/evidence/${mode}-playwright.json` }],
    ['html', { outputFolder: `output/playwright/report-${mode}`, open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:4184', trace: 'retain-on-failure', screenshot: 'only-on-failure', viewport: { width: 1280, height: 900 } },
  projects: [{ name: 'chromium', use: { browserName: 'chromium', channel: 'chromium' } }],
  webServer: [
    { command: `node ${build.directory}/server/index.mjs`, url: 'http://127.0.0.1:4184/api/health', reuseExistingServer: false,
      env: { PAYROLL_DB: `data/payroll-playwright-${mode}.sqlite`, PORT: '4184', HOST: '127.0.0.1' }, timeout: 60000 },
  ],
});
