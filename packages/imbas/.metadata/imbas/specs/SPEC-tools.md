---
version: 0.1
status: stub
updated: 2026-04-06
---

# SPEC-tools — imbas MCP Tool Surface

## Purpose

Inventory of tools exposed by the imbas MCP server
(`mcp__plugin_imbas_tools__*`). Finalized in Phase A-thick. This spec does NOT
grow in the local-provider cycle — imbas's own tool surface is unchanged.

## Scope (to be expanded)

- Existing tool inventory (manifest parsing, state, AST, cache metadata).
- `config_get` / `config_set` now cover the new `provider` field automatically
  via the updated `ImbasConfigSchema`; no new tool.
- Explicit non-addition: NO `local_issue_create`, NO `local_issue_read`,
  NO `github_*` tools. Local provider operations are performed by the LLM via
  Read/Write/Edit/Glob per the skill workflow.

## References

- `packages/imbas/src/mcp/tools/` (authoritative tool sources)
- `.omc/plans/imbas-local-provider.md`
