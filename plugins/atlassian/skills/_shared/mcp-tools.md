# MCP Tools

All Atlassian operations route through these 4 MCP tools:

| Tool | HTTP Method | Purpose |
|---|---|---|
| `mcp__plugin_atlassian_tools__fetch` | GET/POST/PUT/PATCH/DELETE | HTTP requests — resource retrieval, creation, modification, deletion |
| `mcp__plugin_atlassian_tools__convert` | — | ADF / Storage Format ↔ Markdown conversion |
| `mcp__plugin_atlassian_tools__auth_check` | — | Authentication status check and optional connectivity test |
| `mcp__plugin_atlassian_tools__setup` | — | Authentication and connection configuration |

## Tool Usage by Skill

| Skill | Tools Used |
|---|---|
| `jira` | `mcp__plugin_atlassian_tools__fetch` |
| `confluence` | `mcp__plugin_atlassian_tools__fetch`, `mcp__plugin_atlassian_tools__convert` |
| `download` | `mcp__plugin_atlassian_tools__fetch` (with `method: "GET"` and `accept_format: "raw"`) |
| `setup` | `mcp__plugin_atlassian_tools__auth_check`, `mcp__plugin_atlassian_tools__setup` |

The general skills (`jira`, `confluence`, `download`) reach `mcp__plugin_atlassian_tools__auth_check` only transitively when invoking `setup` on HTTP 401 — they never call it directly per the [optimistic execution protocol](./auth_check.md#general-skills-flow-jira-confluence-download).

## Multipart Upload

For attachment uploads via `mcp__plugin_atlassian_tools__fetch` with `method: "POST"`:
- `content_type: "multipart/form-data"` — set in tool params
- `X-Atlassian-Token: nocheck` — auto-added by the fetch tool for multipart requests (not caller responsibility)
