# Customer Problem Decomposition
**TestRelic FDE Intern Assignment · Discovery Call Analysis**

---

## Root Cause Analysis

The customer is asking for better test reports, but the real problem is that test results
have zero visibility into the workflow where decisions actually get made. The symptom is
unread XML files; the cause is that there is no feedback loop between CI failures and the
developers who can act on them. Flaky tests have eroded trust — when everything "fails"
noise, real failures stop feeling urgent. Without a QA engineer, no one owns the signal,
so it disappears. The core gap is not tooling; it is the absence of any mechanism that
turns a test result into a named, actionable decision.

---

## Jobs-to-be-Done

**F1.** When my CI run finishes, I want to see a plain-English summary of what broke and
why, so I can fix real regressions without reading 800 lines of stack trace.

**F2.** When reviewing failures over time, I want to know which tests are flaky noise vs.
reliable signal, so I can decide which failures demand immediate action and which to
suppress.

**F3.** When a new developer joins the team, I want them to understand test health in
under 15 minutes, so I can keep testing ownership distributed without a dedicated QA
engineer.

**E1.** When something breaks in production, I want to feel like my test suite was already
watching for it, so I can trust that CI is protecting us — not just running as a formality.

---

## Failure Modes at Scale

| # | Failure Mode | Symptom | Prevention |
|---|---|---|---|
| 1 | **Silent upload failures** | API key not set or expired; results never reach dashboard; developer assumes tool is working | Warn loudly on stdout if `TESTRELIC_API_KEY` is missing; fail CI step with explicit error message, not silent exit |
| 2 | **Flakiness signal ignored** | Teams see "⚠️ Flaky" label but take no action; noise accumulates and trust erodes again | Surface flakiness as a count in the summary header, not just per-test; add a threshold warning: "3 tests flagged flaky this week" |
| 3 | **Setup friction kills adoption** | Teams with non-standard CI (monorepos, custom runners) spend hours on config and abandon | Ship a single-command init script; document the 3 most common CI failure patterns with exact error messages and fixes |

---

## Success Metric

**Activation signal:** A developer opens the TestRelic dashboard and queries a test
failure in natural language within 10 minutes of their first CI run completing.

In TestRelic's analytics this maps to: `time_to_first_mcp_query` on a project where
`first_upload_event` occurred in the same session, threshold ≤ 10 minutes. A team that
reaches this moment has closed the full loop — from test failure to actionable insight —
without reading a single XML file. That is the value the customer described, made
observable.