---
version: 0.1
status: stub
updated: 2026-04-06
---

# SPEC-provider-jira — Jira Provider Executor

## Purpose

Placement rule and tool surface for the Jira provider. Content is finalized in
Phase A-thick. This stub exists so other SPEC files can cross-reference it from
Phase A-thin forward.

## Scope (to be expanded)

- Jira executor content physically lives inside each pinned skill's
  `references/jira/**` directory after Phase C partitioning.
- Atlassian MCP server (`atlassian` in `.mcp.json`) is the sole network path.
- Tool surface: `mcp__plugin_imbas_atlassian__*`.
- No Jira-specific TypeScript class exists or should be added.

## References

- `.omc/plans/imbas-local-provider.md`
