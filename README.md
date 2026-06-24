# TestRelic FDE Assignment — Swiggy Browser Test Suite

A Playwright suite that exercises real user journeys on **Swiggy's public website**
([swiggy.com](https://www.swiggy.com)) and uploads every run to **TestRelic cloud**,
so the dashboard populates with full diagnostics — **Video, Screenshots, Trace,
Console logs, Network Requests, and Nav Logs** — for each test.

It:

1. **Runs** 6 browser tests against `https://www.swiggy.com` (`npx playwright test`).
2. **Captures** artifacts for every test — `video: 'on'`, `screenshot: 'on'`,
   `trace: 'on'` in [`playwright.config.ts`](playwright.config.ts).
3. **Uploads** each run to **TestRelic cloud** via the
   [`@testrelic/playwright-analytics`](https://www.npmjs.com/package/@testrelic/playwright-analytics)
   reporter, under the project **`fde-assignment`**.

The tests import `test`/`expect` from
**`@testrelic/playwright-analytics/fixture`** (not `@playwright/test`). That
fixture wraps the `page` object so TestRelic can record **Network Requests,
video sync, Console logs, and Test Navigation (Nav Logs)** — the columns that
stay empty with the stock Playwright import.

---

## 🎥 Demo

[Watch the 3-minute walkthrough on Loom](https://www.loom.com/share/d185f31e95bd4e329da3c43dc5726dc2)

---

## 📦 Deliverables

| Deliverable | Location |
|---|---|
| Problem Decomposition | [`docs/problem.md`](docs/problem.md) |
| Playwright Config (artifact capture + cloud upload) | [`playwright.config.ts`](playwright.config.ts) |
| Playwright Test Suite (6 Swiggy browser tests, 1 intentional failure) | [`tests/swiggy.spec.ts`](tests/swiggy.spec.ts) |
| TestRelic Dashboard Screenshot | [`docs/TestRelic Dashboard Screenshots/Real ingested test results.png`](docs/TestRelic%20Dashboard%20Screenshots/Real%20ingested%20test%20results.png) |
| MCP Query Screenshots | [`docs/MCP Query Screenshots/NL prompt.png`](docs/MCP%20Query%20Screenshots/NL%20prompt.png) · [`docs/MCP Query Screenshots/AI insight response.png`](docs/MCP%20Query%20Screenshots/AI%20insight%20response.png) |
| Scale Brief | [`docs/scale.md`](docs/scale.md) |
| GitHub Actions CI Run | [View workflow run ↗](https://github.com/MiniPiku/TestRelic-Assignement/actions/runs/28055023993/job/83055064332) |
| Demo Video | [Loom ↗](https://www.loom.com/share/d185f31e95bd4e329da3c43dc5726dc2) |

---

## The 6 tests

All in [`tests/swiggy.spec.ts`](tests/swiggy.spec.ts), written from a user's
perspective:

| # | Test | What it covers |
|---|------|----------------|
| 1 | Homepage loads and renders the location search bar | Homepage paint + search entry point |
| 2 | User can search for a city or location | Location autocomplete (network call) |
| 3 | Restaurant listing page loads with results | City restaurant collection renders |
| 4 | A restaurant page opens successfully | Navigation into a restaurant/menu page |
| 5 | Cart interaction — user can open the cart | Cart view interaction |
| 6 | **Order fails when restaurant is unavailable** | **Intentional failure** (`expect(1).toBe(2)`) — shows how a failed journey surfaces in the dashboard with its video, screenshot, and trace |

`npx playwright test` is expected to end with **1 failed** (test #6) — that is
the intended outcome, demonstrating how a real failure appears on the dashboard.

---

## Prerequisites

- **Node 18+** (developed on Node 22) and **npm**
- A **TestRelic API key** (for cloud upload)

## Setup

```bash
npm install
npx playwright install        # download the Chromium browser
cp .env.example .env          # then edit .env and set TESTRELIC_API_KEY
npx playwright test
```

> Unlike the previous CLI-fixture version, these are **real browser tests**
> against the live Swiggy site, so a browser download (`npx playwright install`)
> and network access are required.

Running the suite produces, for every test:

- A **video** (`video: 'on'`), **screenshots** (`screenshot: 'on'`), and a
  **trace** (`trace: 'on'`) under `test-results/`
- **Console logs**, **Network Requests**, and **Nav Logs**, captured by the
  `@testrelic/playwright-analytics/fixture` wrapping of `page`
- An upload to TestRelic cloud under the project **`fde-assignment`** (when
  `TESTRELIC_API_KEY` is set)

## How artifact capture + cloud upload work

Two pieces work together:

**1. Artifact capture** — [`playwright.config.ts`](playwright.config.ts):

```ts
use: {
  video: 'on',
  screenshot: 'on',
  trace: 'on',
  // ...plus a realistic browser context (see "Bot challenge" below).
}
```

**2. Fixture import** — every test in
[`tests/swiggy.spec.ts`](tests/swiggy.spec.ts):

```ts
import { test, expect } from '@testrelic/playwright-analytics/fixture';
```

This fixture instruments `page` so Network Requests, Console logs, and
Navigation are recorded and synced with the video timeline.

**3. Cloud upload** — the TestRelic reporter in
[`playwright.config.ts`](playwright.config.ts):

```ts
['@testrelic/playwright-analytics', {
  projectName: 'fde-assignment',
  cloud: {
    apiKey: process.env.TESTRELIC_API_KEY,
    upload: 'both',          // local file + cloud
    uploadArtifacts: true,
  },
}]
```

The project name shown in the dashboard comes from
[`.testrelic/testrelic-config.json`](.testrelic/testrelic-config.json)
(`testrelic-repo.name = "fde-assignment"`). The endpoint defaults to production;
set `TESTRELIC_CLOUD_ENDPOINT` (or the `TESTRELIC_STAGE_*` vars) to override.

## Bot challenge

Swiggy fronts the site with an Akamai-style bot challenge that serves a **blank
HTTP 202** to vanilla headless Chromium (empty `<title>`, no DOM). To let the
challenge resolve so the real SPA renders, [`playwright.config.ts`](playwright.config.ts)
configures a realistic browser context — a real desktop Chrome **user agent**,
**`en-IN` locale**, **`Asia/Kolkata` timezone**, a **1366×768 viewport**, an
`Accept-Language` header, and `--disable-blink-features=AutomationControlled` —
and each test masks `navigator.webdriver` via `page.addInitScript(...)` before
navigating. With these in place the homepage, location autocomplete, restaurant
listing, restaurant page, and cart all render and the suite runs **5 passed,
1 failed** (the intentional failure).

> Restaurant cards on the homepage are location-gated; this run detects the
> region from the runner's IP (India → Kolkata in the captured run).

## Project layout

```
.
├── README.md
├── playwright.config.ts    # artifact capture (video/screenshot/trace) + reporters
├── tests/
│   └── swiggy.spec.ts      # 6 Swiggy browser tests (1 intentional failure)
├── .github/
│   └── workflows/
│       └── ci.yml          # runs the suite + uploads to TestRelic
├── .testrelic/             # TestRelic cloud config (endpoint + repo name)
├── test-results/           # videos, screenshots, traces, analytics timeline
├── docs/
│   ├── problem.md          # customer problem decomposition (Part 1)
│   ├── scale.md            # scale brief (Part 4)
│   ├── GitHub Actions CI Run/
│   ├── MCP Query Screenshots/
│   └── TestRelic Dashboard Screenshots/
├── package.json
├── tsconfig.json
└── .env.example
```

## Screenshots

### TestRelic Dashboard
![TestRelic Dashboard](docs/TestRelic%20Dashboard%20Screenshots/Real%20ingested%20test%20results.png)

### MCP AI Insight
![NL Prompt](docs/MCP%20Query%20Screenshots/NL%20prompt.png)
![AI Insight Response](docs/MCP%20Query%20Screenshots/AI%20insight%20response.png)

### GitHub Actions CI Run
![CI Run](docs/GitHub%20Actions%20CI%20Run/CI%20run.png)
![GitHub Actions Job](docs/GitHub%20Actions%20CI%20Run/Github%20Actions%20job.png)
**Link:** https://github.com/MiniPiku/TestRelic-Assignement/actions/runs/28055023993/job/83055064332
