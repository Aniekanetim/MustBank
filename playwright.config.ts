import { defineConfig } from '@playwright/test';
const mode = process.env.QUEST_BEHAVIOR === 'faulty' ? 'faulty' : 'fixed';

export default defineConfig({
  testDir: './tests', testMatch: '**/*.spec.ts', fullyParallel: true,
  workers: 2, retries: 0, timeout: 30000,
  outputDir: `output/playwright/${mode}`,
  reporter: [['line'], ['json', { outputFile: `assessment/evidence/${mode}-playwright.json` }],
    ['html', { outputFolder: `output/playwright/report-${mode}`, open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:5173', trace: 'retain-on-failure', screenshot: 'only-on-failure', viewport: { width: 1280, height: 900 } },
  projects: [{ name: 'chromium', use: { browserName: 'chromium', channel: 'chromium' } }],
  webServer: [
    { command: 'node server/index.mjs', url: 'http://127.0.0.1:4174/api/health', reuseExistingServer: false,
      env: { REWARDS_DB: 'data/playwright.sqlite', PORT: '4174', HOST: '127.0.0.1' }, timeout: 60000 },
    { command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1', url: 'http://127.0.0.1:5173', reuseExistingServer: false,
      timeout: 60000 },
  ],
});
