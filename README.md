# TestRelic FDE Assignment — Amazon Browser Test Suite

A Playwright suite that exercises real, **multi-step user journeys** on
**Amazon India's public website** ([amazon.in](https://www.amazon.in)) and
uploads every run to **TestRelic cloud**, so the dashboard populates with full
diagnostics — **Video, Screenshots, Trace, Console logs, Network Requests, and
Nav Logs** — for each test.

It:

1. **Runs** 5 deep browser journeys against `https://www.amazon.in`
   (`npx playwright test`).
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
| Playwright Test Suite (5 multi-step Amazon journeys) | [`tests/amazon.spec.ts`](tests/amazon.spec.ts) |
| TestRelic Dashboard Screenshot | [`docs/TestRelic Dashboard Screenshots/Real ingested test results.png`](docs/TestRelic%20Dashboard%20Screenshots/Real%20ingested%20test%20results.png) |
| MCP Query Screenshots | [`docs/MCP Query Screenshots/NL prompt.png`](docs/MCP%20Query%20Screenshots/NL%20prompt.png) · [`docs/MCP Query Screenshots/AI insight response.png`](docs/MCP%20Query%20Screenshots/AI%20insight%20response.png) |
| Scale Brief | [`docs/scale.md`](docs/scale.md) |
| GitHub Actions CI Run | [View workflow run ↗](https://github.com/MiniPiku/TestRelic-Assignement/actions/runs/28083767077/job/83144615529) |
| Demo Video | [Loom ↗](https://www.loom.com/share/86464a8c6f5a4775af392145603f4403)

---

## The 5 tests

All in [`tests/amazon.spec.ts`](tests/amazon.spec.ts). These are deliberately
**deep, multistage journeys**: each test chains several `test.step()` stages
**and** verifies data that flows *across* stages — not merely "did a page
load". None of them fails on purpose; all 5 are expected to pass.

| # | Test | The journey (every stage asserted) |
|---|------|------------------------------------|
| 1 | Search results sort by price and paginate correctly | Homepage → search "bluetooth speaker" → sort by *Price: Low to High* → **assert the sorted prices actually trend upward** (cheaper half vs. pricier half of the live prices) → go to page 2 and assert the results grid re-renders |
| 2 | Product carries its title and price from results to the detail page | Search "mechanical keyboard" → capture the first organic result's **title and price** → open its detail page → **assert the PDP title matches the captured card title** and the PDP price is in the same ballpark → assert "About this item" renders |
| 3 | Cart subtotal reflects quantity × unit price, then empties on removal | Search "usb cable" → open a product → capture its **unit price** → add to cart (declining the protection-plan modal) → open the cart → set quantity to 2 → **assert subtotal ≈ 2 × unit price** → remove the item → assert the cart reports empty (0 items) |
| 4 | Mega-menu navigation into a department preserves back/forward state | Homepage → open the "All" mega-menu → drill into a department listing → open a product → **Back restores the listing, Forward returns to the product page** |
| 5 | Bestsellers list is rank-ordered and the top item opens its detail page | Open Electronics Bestsellers → **assert the visible rank badges ascend (#1, #2, #3…)** → open the top item and assert it lands on a real product detail page |

`npx playwright test` is expected to end with **0 failed** — every journey
passes (or, if Amazon serves a bot challenge, skips cleanly; see below).

### Resilience against Amazon's bot challenge

Amazon fronts amazon.in with a CAPTCHA / "Continue shopping" interstitial that
triggers far more often for headless browsers on non-India CI IPs. The suite
handles this in three layers so a challenge never turns the run red:

1. **A realistic browser context** in [`playwright.config.ts`](playwright.config.ts)
   (real Chrome UA, `en-IN` locale, `Asia/Kolkata` timezone, desktop viewport,
   `Accept-Language` header) plus a `navigator.webdriver` mask in the spec —
   this materially reduces how often the challenge is served at all.
2. **Detection + clean skip** — every test checks for the challenge after each
   landing (`isBotChallenge` / `skipIfBlocked`) and `test.skip()`s instead of
   failing when one is served.
3. **CI retries** — `retries: 2` on CI only, so bot-challenge / network jitter
   gets a second chance while local failures still surface immediately.

Other robustness details baked into the spec:

- **Sponsored-ad cards are excluded** when picking "the first result" — their
  titles link to `/sspa/click` redirects, not product pages.
- **Result title links open in a new tab** (`target="_blank"`), so the suite
  navigates to the link's `href` to keep the whole journey on one page object.
- **Overlays are dismissed best-effort** (cookie consent, "Continue shopping",
  the post-add-to-cart protection-plan modal).
- **Every test ends on `about:blank`** — Amazon pages hold long-lived
  streaming/telemetry connections open, which can stall the analytics
  fixture's teardown while it collects response bodies.
- **No hardcoded catalog facts** — assertions verify the *shape* of live data
  (prices ascend, ranks ascend, titles carry across pages), never a specific
  product, price, or rank.

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

> These are **real browser tests** against the live Amazon India site, so a
> browser download (`npx playwright install`) and network access are required.

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
  // ...plus a realistic browser context (see "Bot challenge" above).
}
```

**2. Fixture import** — every test in
[`tests/amazon.spec.ts`](tests/amazon.spec.ts):

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

## Project layout

```
.
├── README.md
├── playwright.config.ts    # artifact capture (video/screenshot/trace) + reporters
├── tests/
│   └── amazon.spec.ts      # 5 multi-step Amazon journeys (all expected to pass)
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
**Link:** https://github.com/MiniPiku/TestRelic-Assignement/actions/runs/28083767077/job/83144615529
