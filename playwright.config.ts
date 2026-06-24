import * as path from 'node:path';

import * as dotenv from 'dotenv';
import { defineConfig } from '@playwright/test';

// Load this project's local .env BEFORE the TestRelic reporter reads process.env.
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Mirror staging credentials onto the names @testrelic/core reads last, so a
// staging key can coexist with a prod key in the same .env. (Same logic the
// monorepo's scripts/apply-testrelic-staging-env.mjs uses.)
const stageKey = (process.env.TESTRELIC_STAGE_API_KEY || '').trim();
if (stageKey) {
  process.env.TESTRELIC_API_KEY = stageKey;
  process.env.TESTRELIC_CLOUD_ENDPOINT =
    (process.env.TESTRELIC_STAGE_CLOUD_ENDPOINT || '').trim() ||
    'https://stage.testrelic.ai/api/v1';
}

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  retries: 0,
  workers: 1,
  // Capture artifacts for every test so the TestRelic dashboard populates its
  // Video, Screenshots, and Trace columns. Console logs, Network Requests, and
  // Nav Logs are captured by the @testrelic/playwright-analytics fixture (the
  // tests import `test`/`expect` from '@testrelic/playwright-analytics/fixture').
  use: {
    baseURL: 'https://www.swiggy.com',
    video: 'on',
    screenshot: 'on',
    trace: 'on',
    // Swiggy fronts the site with an Akamai-style bot challenge that serves a
    // blank HTTP 202 to vanilla headless Chromium. A realistic browser context
    // (real UA, India locale/timezone, desktop viewport, Accept-Language) plus
    // the automation-flag mask in tests/swiggy.spec.ts lets the challenge
    // resolve so the real SPA renders and the tests can see actual content.
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
    viewport: { width: 1366, height: 768 },
    extraHTTPHeaders: { 'Accept-Language': 'en-IN,en;q=0.9' },
    launchOptions: { args: ['--disable-blink-features=AutomationControlled'] },
    navigationTimeout: 45_000,
    actionTimeout: 20_000,
  },
  reporter: [
    ['list'],
    // Emit a CTRF-compatible JSON file the CLI can summarize.
    ['playwright-ctrf-json-reporter', { outputDir: 'ctrf', outputFile: 'ctrf-report.json' }],
    // Upload the run to TestRelic cloud. The `cloud` block is what actually
    // ships results to the dashboard (project name comes from
    // .testrelic/testrelic-config.json -> testrelic-repo.name = "fde-assignment").
    ['@testrelic/playwright-analytics', {
      projectName: 'fde-assignment',
      outputPath: './test-results/analytics-timeline.json',
      includeStackTrace: true,
      includeCodeSnippets: true,
      metadata: { project: 'fde-assignment' },
      cloud: {
        apiKey: process.env.TESTRELIC_API_KEY,
        upload: 'both',
        uploadArtifacts: true,
        artifactMaxSizeMb: 10,
        timeout: 30_000,
      },
    }],
  ],
});
