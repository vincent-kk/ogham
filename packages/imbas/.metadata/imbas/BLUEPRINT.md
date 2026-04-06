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

| Provider | Status (v1.2) | Storage | Tool surface |
|---|---|---|---|
| `jira`   | Shipping | Any Jira-capable tool (Atlassian Cloud MCP, on-premise, custom plugin) | `[OP:]` semantic notation — LLM resolves at runtime |
| `github` | Shipping (from v1.2) | GitHub via `gh` CLI (ambient `gh auth`) | `gh issue *`, `gh label *`, `gh api` via Bash |
| `local`  | Shipping (from v1.1) | Markdown files under `.imbas/<KEY>/issues/` | Read/Write/Edit/Glob (no MCP, no network) |

Default provider is `jira` for backward compatibility. Selection is via
`config.provider` in `.imbas/config.json`.

## Pipeline stages

Five skills form the core pipeline:

1. `imbas-validate` — document coherence/consistency/feasibility check
2. `imbas-split` — decompose into Stories
3. `imbas-devplan` — generate EARS Subtasks + extract cross-Story Tasks
4. `imbas-manifest` — batch-create tracker entities from stories/devplan manifests
5. `imbas-digest` / `imbas-status` — compress discussion context / show run progress

Provider-aware skills (`imbas-manifest`, `imbas-read-issue`, `imbas-digest`, `imbas-devplan`) carry
the `<!-- imbas:constraints-v1 -->` anchor block in their `SKILL.md` and
partition their `references/` directory into `jira/` and `local/`
subdirectories. Skills with <15-line provider divergence (`imbas-validate`, `imbas-cache`,
`imbas-fetch-media`, `imbas-pipeline`, `imbas-status`) are NOT partitioned and handle any
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

- **v1.2 (2026-04-06)** — GitHub provider shipping. RALPLAN v2 cycle
  authored `references/github/**` partitions for all 4 pinned skills
  (manifest/read-issue/digest/devplan — devplan measured at 36 lines,
  above the 15-line threshold), added `GithubConfigSchema` to
  `ImbasConfigSchema`, extended `skill-constraints-block.test.ts` with
  github dispatch row assertions and 5 new gh forbidden tokens
  (`gh issue create/view/comment/close`, `gh label create`), migrated
  the 4-line jira prototype snippet into
  `manifest/references/github/workflow.md` and deleted the historical
  preservation block, created the `src/providers/github/` fractal node
  with a pure `parseLinks` function implementing the `## Links` grammar,
  added `scripts/test-helpers/gh-shim.mjs` + `github-mode-smoke.mjs`
  + `check-spec-ref-backlinks.mjs` CI gates. No new MCP tools, no
  `ManifestStorySchema` changes, agent `tools:` frontmatter baseline
  unchanged (gh uses ambient Bash).
- **v1.1 (2026-04-06)** — Local provider shipping. RALPLAN v2 cycle
  partitioned 4 skills (manifest/read-issue/digest/devplan), added
  `ProviderSchema` to `ImbasConfigSchema`, established the
  `<!-- imbas:constraints-v1 -->` anchor protocol, and committed the
  agent tools frontmatter baseline gate.
- **v1.0 (2026-04-06)** — Initial skeleton during Phase A-thin.
