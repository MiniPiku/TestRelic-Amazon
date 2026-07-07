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
  // ISSUE 5.1: retry flaky runs on CI (bot-challenge / network jitter) but keep
  // local runs at 0 so failures surface immediately while developing.
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  // Capture artifacts for every test so the TestRelic dashboard populates its
  // Video, Screenshots, and Trace columns. Console logs, Network Requests, and
  // Nav Logs are captured by the @testrelic/playwright-analytics fixture (the
  // tests import `test`/`expect` from '@testrelic/playwright-analytics/fixture').
  use: {
    baseURL: 'https://www.amazon.in',
    video: 'on',
    screenshot: 'on',
    trace: 'on',
    // Amazon fronts amazon.in with a CAPTCHA / "Continue shopping" bot challenge
    // that it serves to vanilla headless Chromium (most aggressively from a
    // non-India CI IP). A realistic browser context (real UA, India
    // locale/timezone, desktop viewport, Accept-Language) plus the automation-
    // flag mask in tests/amazon.spec.ts lets the challenge resolve so the real
    // page renders. When a challenge is served anyway, each test detects it and
    // skips cleanly (see isBotChallenge in the spec) so the run never fails.
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
        // Raised from the defaults so artifacts (videos/screenshots) reliably
        // upload from slower CI networks instead of being dropped on a 30s
        // timeout — this is what populates the dashboard's Video/Screenshots.
        // (Uploads run in the reporter process, outside any test's timeout,
        // so this allowance cannot affect test results.)
        artifactMaxSizeMb: 50,
        timeout: 120_000,
      },
    }],
  ],
});
