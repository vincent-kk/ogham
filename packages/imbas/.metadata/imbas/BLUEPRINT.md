---
version: 1.0
status: bootstrap
updated: 2026-04-06
---

# imbas Blueprint

## Purpose

imbas is a Claude Code plugin that drives an LLM-orchestrated pipeline from planning
documents to structured issue trackers. The plugin ships with three issue-tracker
providers — `jira` (primary), `github` (prototype), and `local` (file-based, added
by RALPLAN v2 cycle 2026-04-06).

This blueprint is the top-level architecture document. Per-provider specifications,
state-file layouts, and skill routing live under `specs/`.

## Architecture Invariant

imbas TypeScript code never calls tracker HTTP APIs directly. Tracker interaction
happens entirely through MCP servers that the LLM orchestrates via skill
instructions. The TypeScript layer owns manifest parsing/validation, state
management, and AST analysis only. Provider abstraction therefore lives in skill
documents + reference partitioning, not in TypeScript class hierarchies.

## Providers

| Provider | Status | Storage | Tool surface |
|---|---|---|---|
| `jira`   | Shipping | Atlassian Cloud via `atlassian` MCP server | `mcp__plugin_imbas_atlassian__*` |
| `github` | Prototype (2-line `gh issue view`) | GitHub via `gh` CLI (planned) | Planned — see handoff doc |
| `local`  | Shipping (from v1.1) | Markdown files under `.imbas/<KEY>/issues/` | Read/Write/Edit/Glob |

Default provider is `jira` for backward compatibility. Switching is via
`config.provider` in `.imbas/config.json`.

## Pipeline stages

Five skills form the core pipeline: `validate` → `split` → `devplan` → `manifest`
(creation) → `digest` / `status` (observation). All five are provider-aware. See
`specs/SPEC-skills.md` for per-skill divergence and routing granularity.

## Documents

- `specs/SPEC-provider.md` — provider abstraction principle and threshold rule.
- `specs/SPEC-provider-jira.md` — Jira executor placement.
- `specs/SPEC-provider-local.md` — Local executor full spec (storage, IDs, links).
- `specs/SPEC-state.md` — `.imbas/` directory layout + config schema.
- `specs/SPEC-skills.md` — per-skill divergence table + SKILL.md anchor block.
- `specs/SPEC-tools.md` — imbas MCP tool surface.

## Issue Architecture (summary)

| Concept | Jira | Local |
|---|---|---|
| Epic    | Epic issue type + Epic Link field | Story frontmatter `epic:` field |
| Story   | Story issue type | `.imbas/<KEY>/issues/stories/S-<N>.md` |
| Task    | Task issue type  | `.imbas/<KEY>/issues/tasks/T-<N>.md` |
| Subtask | Sub-task issue type | `.imbas/<KEY>/issues/subtasks/ST-<N>.md` |
| Link    | Native link types (blocks, is blocked by, split_*) | Frontmatter `links[]` bidirectional |
| Status  | Workflow states (To Do → Done) | Frontmatter `status:` field |

GitHub column intentionally omitted — see `.omc/plans/imbas-github-provider-handoff.md`.

## History

- v1.0 (2026-04-06, bootstrap): initial skeleton. Phase A-thin of local-provider cycle.
- v1.1 (pending Phase A-thick): local provider finalized.
- v1.2 (reserved): GitHub provider cycle.
