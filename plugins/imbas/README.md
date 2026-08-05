# @ogham/imbas

A Claude Code plugin for the planner's side of product development: it refines a planning document, estimates man-days and a schedule, splits the plan into well-formed issues on Jira, GitHub Issues, or local markdown — and scaffolds draft PRs to hand off to development.

> [한국어 문서 (README-ko_kr.md)](./README-ko_kr.md)

Writing specs is easy. Turning them into a defensible estimate and a clean backlog is tedious and error-prone. imbas automates the planner workflow as a **3-phase pipeline** driven by specialized AI agents — and deliberately stops where development begins: no code exploration, no implementation planning.

```
planning document
  → refine    : restructure into a standard layout + 5-type validation
  → estimate  : 3-view WBS + PERT man-days + schedule            (optional)
  → split     : INVEST decomposition → approval → issue creation
  → scaffold-pr : draft PR skeletons per issue                    (follow-up)
```

---

## Installation

### Via Marketplace (Recommended)

```bash
# 1. Add the repository to your marketplace
claude plugin marketplace add https://github.com/vincent-kk/ogham

# 2. Install the plugin
claude plugin install imbas
```

All components (Skills, MCP, Agents) register automatically. No manual configuration needed.

### For Development (Local Setup)

```bash
# From monorepo root
yarn install
yarn workspace @ogham/imbas build
```

---

## Quick Start

```bash
# 1. One-time setup — provider, project, labels, languages, estimation
#    coefficients in a browser form
/imbas:setup

# 2. Refine and validate a planning document
/imbas:refine requirements.md

# 3. (Optional) Estimate man-days and a schedule
/imbas:estimate

# 4. Split into issues and create them (with an approval gate)
/imbas:split

# …or run the whole flow in one command
/imbas:pipeline requirements.md
```

---

## Skills

| Skill                  | Phase | What it does                                                                              |
| ---------------------- | ----- | ----------------------------------------------------------------------------------------- |
| `/imbas:setup`         | —     | Browser settings form (provider, project, labels, languages, models, estimation) + caches |
| `/imbas:refine`        | 1     | Restructures the document into a standard 8-section layout; 5-type validation gate        |
| `/imbas:estimate`      | 2     | 3-view decomposition → reconciled WBS → PERT man-days → team-sized schedule (optional)    |
| `/imbas:split`         | 3     | INVEST issue decomposition → approval gate → batch creation with resume                   |
| `/imbas:scaffold-pr`   | post  | Draft PR skeleton (branch, empty commit, checklist) from an issue                         |
| `/imbas:pipeline`      | 1–3   | Full flow with auto-approval gates and blocker reports                                    |
| `/imbas:status`        | —     | Run status, artifact presence, resume guidance                                            |
| `/imbas:digest`        | —     | Compresses an issue's discussion thread into a posted summary                             |
| `imbas:read-issue`     | —     | (internal) Structured issue + thread context for other skills                             |

## Agents

| Agent       | Model  | Role                                                                 |
| ----------- | ------ | -------------------------------------------------------------------- |
| `analyst`   | sonnet | 5-type validation + document restructuring; reverse-inference checks |
| `planner`   | sonnet | INVEST-compliant issue decomposition                                 |
| `estimator` | opus   | Context-heavy estimation: 3-view WBS, PERT, schedule                 |

## Estimation

The estimate phase answers "how long will this take" from the refined document alone — it never reads a codebase:

- **3-view decomposition** (pages / features / modules) with cross-view reconciliation, so one view's blind spot is another's catch
- **PERT per unit** (`expected = (o + 4m + p) / 6`) anchored on configurable S/M/L/XL baselines
- **Rollup** with integration/test/PM overhead and a buffer ratio → total with a confidence interval
- **Schedule** on `team_size` parallel tracks with milestones and a mermaid gantt report
- Every gap becomes an explicit assumption; high-sigma units are auto-promoted to risks

Coefficients live in `config.estimation` (user/project layers) and are editable in the settings form.

## Providers

| Provider | Issues created via                                     |
| -------- | ------------------------------------------------------ |
| `jira`   | `[OP:]` semantic operations resolved against the session's Atlassian tools |
| `github` | `gh` CLI                                               |
| `local`  | Markdown files under `.imbas/<KEY>/issues/`            |

imbas owns no Atlassian credentials or transport — Jira operations state REST intent and the session's Atlassian tooling executes it.

## Architecture Notes

- **Plan-then-execute** — decomposition writes a manifest; nothing reaches the provider before the approval gate
- **Manifest as ledger** — per-item `issue_ref`/`status` is saved after each creation, so re-runs resume idempotently
- **Run-based state** — each execution gets `.imbas/<KEY>/runs/<id>/` with a deterministic state machine (`refine → estimate(skippable) → split`) enforced by the MCP server
- **9 MCP tools** — run state machine (4), manifest validation (2), config layers (2), settings web UI (1); artifacts are plain files read/written directly
- **No hooks** — the plugin injects nothing into your session lifecycle

Design documents: [`.metadata/imbas/`](../../.metadata/imbas/README.md)

## License

MIT
