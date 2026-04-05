---
version: 1.0
status: active
updated: 2026-04-06
---

# SPEC-tools — imbas MCP Tool Surface

## Purpose

Inventory of tools exposed by the imbas MCP server
(`mcp__plugin_imbas_tools__*`). The RALPLAN v2 local-provider cycle did
NOT add any new tools; this spec reflects the same tool set as v1.0.

## Tool inventory

Source: `packages/imbas/src/mcp/server/server.ts` (`EXPECTED_TOOLS`).

### Infrastructure

| Tool | Purpose |
|------|---------|
| `ping` | Smoke test / liveness |

### Run state

| Tool | Purpose |
|------|---------|
| `run_create` | Create a new run (state.json + run directory) |
| `run_get`    | Read state.json for a run |
| `run_transition` | Advance phase state (start_phase, complete_phase, escape_phase) |
| `run_list`   | List all runs for a project |

### Manifests

| Tool | Purpose |
|------|---------|
| `manifest_get` | Load stories-manifest.json or devplan-manifest.json |
| `manifest_save` | Persist a manifest (per-item save for crash recovery) |
| `manifest_validate` | Validate manifest structural integrity |
| `manifest_plan` | Generate execution plan for devplan manifest (dry-run) |

### Config

| Tool | Purpose |
|------|---------|
| `config_get` | Read `.imbas/config.json` field. Used at skill Step 0 for provider routing (reads `config.provider`). |
| `config_set` | Write a config field. Covers the `provider` field via the updated `ImbasConfigSchema` with no handler change. |

### Cache (Jira metadata)

| Tool | Purpose |
|------|---------|
| `cache_get` | Read Jira metadata cache (issue types, link types, workflows) |
| `cache_set` | Write/refresh Jira metadata cache |

Local provider treats cache as a no-op; `/imbas:imbas-setup refresh-cache`
short-circuits in local mode.

### AST analysis

| Tool | Purpose |
|------|---------|
| `ast_search` | Pattern search via `@ast-grep/napi` |
| `ast_analyze` | Dependency graph + complexity analysis |

Used by imbas-engineer during devplan code exploration. Provider-agnostic.

## Explicit non-additions (RALPLAN v2 anti-scope)

The RALPLAN v2 cycle verified that the following tools MUST NOT be added
during local-provider work:

- ❌ `local_issue_create` / `local_issue_read` / `local_issue_update`
- ❌ `github_issue_*`
- ❌ Any new tool under `src/mcp/tools/`

Rationale: local provider operations (file read/write/edit, directory
glob, frontmatter parse) are performed by the LLM via Claude Code's
built-in `Read`/`Write`/`Edit`/`Glob` tools as directed by the skill
workflow. Wrapping these in MCP tools would inflate the tool surface
without functional benefit.

Verified by `git diff --stat packages/imbas/src/mcp/tools/` returning
empty for the RALPLAN v2 cycle.

## Provider routing summary

Skills read `config.provider` via `config_get` at Step 0 and load the
matching `references/<provider>/workflow.md`. The dispatch surface is
the `<!-- imbas:constraints-v1 -->` anchor block in SKILL.md. No routing
lives inside the imbas MCP server itself.

## Tests

- `src/__tests__/server-registration.test.ts` — pins the tool name list.
- `src/__tests__/tools/` — per-tool unit tests.
- `src/__tests__/server-schema-ref-free.test.ts` — schema contract.
