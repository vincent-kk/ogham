---
version: 1.1
status: active
updated: 2026-04-06
---

# imbas Blueprint

## Purpose

imbas is a Claude Code plugin that drives an LLM-orchestrated pipeline from
planning documents (PRDs, specs, Confluence pages) to structured issue
trackers. It ships three issue-tracker providers and routes between them at
the skill layer.

## Architecture Invariant

imbas TypeScript code never calls tracker HTTP APIs directly. Tracker
interaction happens entirely through MCP servers that the LLM orchestrates
via skill instructions. The TypeScript layer owns:

- Manifest parsing/validation (`src/types/manifest.ts`)
- Run state management (`src/types/state.ts` + `run_*` MCP tools)
- AST analysis (`ast_search`, `ast_analyze`)
- Config loading (`src/types/config.ts` + `config_get`/`config_set`)

Provider abstraction lives in skill documents + reference directory
partitioning, **not** in TypeScript class hierarchies. See
`specs/SPEC-provider.md` for the rationale.

## Providers

| Provider | Status (v1.1) | Storage | Tool surface |
|---|---|---|---|
| `jira`   | Shipping | Atlassian Cloud via `atlassian` MCP server | `mcp__plugin_imbas_atlassian__*` |
| `github` | Prototype (2-line `gh issue view`) | GitHub via `gh` CLI (planned) | Deferred to next RALPLAN cycle |
| `local`  | Shipping (from v1.1) | Markdown files under `.imbas/<KEY>/issues/` | Read/Write/Edit/Glob (no MCP, no network) |

Default provider is `jira` for backward compatibility. Selection is via
`config.provider` in `.imbas/config.json`.

## Pipeline stages

Five skills form the core pipeline:

1. `validate` — document coherence/consistency/feasibility check
2. `split` — decompose into Stories
3. `devplan` — generate EARS Subtasks + extract cross-Story Tasks
4. `manifest` — batch-create tracker entities from stories/devplan manifests
5. `digest` / `status` — compress discussion context / show run progress

Provider-aware skills (`manifest`, `read-issue`, `digest`, `devplan`) carry
the `<!-- imbas:constraints-v1 -->` anchor block in their `SKILL.md` and
partition their `references/` directory into `jira/` and `local/`
subdirectories. Skills with <15-line provider divergence (`validate`, `cache`,
`fetch-media`, `pipeline`, `status`) are NOT partitioned and handle any
divergence via inline branching in prose. See `specs/SPEC-skills.md` for the
per-skill divergence table.

## Directory layout

```
packages/imbas/
├── .mcp.json                        # atlassian MCP server registration
├── .metadata/imbas/                 # this blueprint + specs
├── src/
│   ├── types/                       # Zod schemas (organ)
│   ├── mcp/tools/                   # imbas MCP tool handlers
│   └── __tests__/                   # unit + e2e tests
├── skills/
│   ├── manifest/                    # partitioned
│   │   └── references/{jira,local}/
│   ├── read-issue/                  # partitioned
│   ├── digest/                      # partitioned
│   ├── devplan/                     # partitioned
│   ├── status/                      # inline (0-line divergence)
│   └── ...                          # validate, cache, setup, split, etc.
└── agents/
    ├── imbas-planner.md
    ├── imbas-engineer.md
    └── imbas-analyst.md
```

Local provider storage layout (added in v1.1):

```
.imbas/<PROJECT-KEY>/
├── config.json
├── issues/
│   ├── stories/     # S-<N>.md
│   ├── tasks/       # T-<N>.md
│   └── subtasks/    # ST-<N>.md
└── runs/<run-id>/   # stories-manifest.json, devplan-manifest.json
```

## Issue Architecture

| Concept | Jira | Local |
|---|---|---|
| Epic    | Epic issue type + Epic Link field | Story frontmatter `epic:` field |
| Story   | Story issue type | `S-<N>.md` under `issues/stories/` |
| Task    | Task issue type  | `T-<N>.md` under `issues/tasks/` |
| Subtask | Sub-task issue type | `ST-<N>.md` under `issues/subtasks/` |
| Link    | Native link types (blocks, is blocked by, split_*) | Frontmatter `links[]` bidirectional |
| Status  | Workflow states (To Do → Done) | Frontmatter `status:` field |

GitHub column intentionally omitted — see
`.omc/plans/imbas-github-provider-handoff.md` for the follow-up cycle.

## Documents

- `specs/SPEC-provider.md` — provider abstraction principle, threshold rule
- `specs/SPEC-provider-jira.md` — Jira placement rule
- `specs/SPEC-provider-local.md` — local storage, IDs, links, file format
- `specs/SPEC-state.md` — `.imbas/` directory layout + config schema
- `specs/SPEC-skills.md` — per-skill divergence + anchor block
- `specs/SPEC-tools.md` — imbas MCP tool inventory

## Version History

- **v1.1 (2026-04-06)** — Local provider shipping. RALPLAN v2 cycle
  partitioned 4 skills (manifest/read-issue/digest/devplan), added
  `ProviderSchema` to `ImbasConfigSchema`, established the
  `<!-- imbas:constraints-v1 -->` anchor protocol, and committed the
  agent tools frontmatter baseline gate.
- **v1.0 (2026-04-06)** — Initial skeleton during Phase A-thin.
- **v1.2 (reserved)** — GitHub provider cycle.
