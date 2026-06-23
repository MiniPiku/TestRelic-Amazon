# Scale

_Placeholder — to be filled in._

> Describe how this approach scales: more tests, more contributors, more repos,
> CI volume, and how TestRelic cloud aggregation helps as the team grows.
# Scale Brief
**TestRelic FDE Intern Assignment · Part 4**

---

## Deployment Playbook — Onboarding 50 Teams

**Sequence from signup to first insight:**

1. **Signup** → create project on `platform.testrelic.ai` → API key generated
2. **Install** → `npm install @testrelic/playwright-analytics`
3. **Configure** → add reporter to `playwright.config.ts` + create
   `.testrelic/testrelic-config.json` with endpoint and repo name
4. **Set secret** → add `TESTRELIC_API_KEY` to GitHub Actions secrets
5. **Push** → first CI run triggers automatic upload
6. **Query** → open TestRelic AI, ask first natural language question about results

**Total time to first insight: ~15 minutes for a developer who reads the README.**

**Where teams drop off:**

| Drop-off Point | Mitigation |
|---|---|
| Step 3 — config structure is non-obvious | Ship a one-command init: `npx testrelic init` that writes both files automatically |
| Step 4 — GitHub secret not set, silent failure | CI step should fail loudly with exact error: "TESTRELIC_API_KEY not set — results not uploaded" |
| Step 6 — dashboard shows data but developer doesn't know what to ask | Pre-populate 3 suggested prompts on first project load: "What failed?", "What's flaky?", "What's my pass rate trend?" |

---

## Top 3 Integration Failure Patterns

**1. `TESTRELIC_API_KEY` not exported in CI**

*Symptom:* Tests run and pass locally, CI passes, but dashboard shows no data.
No error is thrown — the reporter silently skips upload.

*Resolution:*
1. Check GitHub repo → Settings → Secrets → confirm `TESTRELIC_API_KEY` exists
2. In `ci.yml`, confirm `env: TESTRELIC_API_KEY: ${{ secrets.TESTRELIC_API_KEY }}`
   is under the test step, not the job level
3. Re-run workflow — dashboard should populate within 30 seconds of run completing

---

**2. `apiKey` at wrong level in reporter config**

*Symptom:* Reporter loads without error but upload never triggers.
Dashboard stays empty even with correct API key in environment.

*Resolution:*
1. Check `playwright.config.ts` — `apiKey` must be nested inside `cloud: {}`,
   not at the top level of the reporter options
2. Correct structure:
```ts
   cloud: { apiKey: process.env.TESTRELIC_API_KEY, upload: 'both' }
```
3. Re-run tests — upload confirmation should appear in terminal output

---

**3. `.testrelic/testrelic-config.json` missing or malformed**

*Symptom:* Results upload but appear under wrong project name, or endpoint
returns 404. Dashboard shows a different repo name than expected.

*Resolution:*
1. Create `.testrelic/testrelic-config.json` at project root
2. Ensure it contains correct endpoint and repo name:
```json
   {
     "cloud": {
       "endpoint": "https://platform.testrelic.ai/api/v1",
       "upload": "both"
     },
     "testrelic-repo": { "name": "your-project-name" }
   }
```
3. Commit and push — dashboard will reflect correct project name on next run

---

## Feedback Loop Design

**Events to track:**

| Event | Trigger | Why |
|---|---|---|
| `first_upload` | First test result reaches dashboard | Measures successful integration |
| `first_mcp_query` | First NL query run against a project | Measures activation — developer got value |
| `flaky_flag_viewed` | Developer clicks a flaky test label | Measures signal quality |
| `failure_analysis_opened` | AI failure analysis triggered | Measures core use case adoption |
| `repeat_upload_d7` | Upload occurs again within 7 days | Measures retention |

**Activation threshold:** `first_upload` + `first_mcp_query` within the same
session, within 10 minutes. A team that hits this has closed the full loop from
CI failure to actionable insight. This is the moment the product delivers its
core promise.

**Stuck signal:** `first_upload` occurred but no `first_mcp_query` within
48 hours → trigger an onboarding nudge: "Your tests are in — ask AI what
failed."

---

## One Product Insight

**Problem:** The biggest drop-off point in this assignment was not writing code
— it was figuring out the correct reporter config structure. The `apiKey` must
live inside a `cloud:` object, but nothing in the npm package README or the
error output tells you this. The reporter loads silently with a flat config and
simply never uploads. A developer who doesn't know to look for this loses hours.

**Proposed solution:** Add a config validation step to the reporter that runs
at test startup — before any tests execute — and prints a clear message: