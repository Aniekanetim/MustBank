import { defineConfig } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const mode = process.env.QUEST_BEHAVIOR === 'faulty' ? 'faulty' : 'fixed';
const pair = JSON.parse(readFileSync('config/builds.json', 'utf8'));
const build = pair.builds[mode];

export default defineConfig({
  testDir: './tests', testMatch: '**/*.spec.ts', fullyParallel: true,
  workers: 2, retries: 0, timeout: 30000,
  outputDir: resolve(`data/playwright/${mode}`),
  reporter: [['line'], ['json', { outputFile: resolve(`${build.executionDirectory}/playwright/report.json`) }]],
  use: { baseURL: 'http://127.0.0.1:4184', trace: 'off', screenshot: 'off', video: 'off', viewport: { width: 1280, height: 900 } },
  projects: [{ name: 'chromium', use: { browserName: 'chromium', channel: 'chromium' } }],
  webServer: [
    { command: `node ${build.directory}/server/index.mjs`, cwd: process.cwd(), url: 'http://127.0.0.1:4184/api/health', reuseExistingServer: false,
      env: { PAYROLL_DB: `data/payroll-playwright-${mode}.sqlite`, PORT: '4184', HOST: '127.0.0.1' }, timeout: 60000 },
  ],
});
