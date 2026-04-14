# MCP Tools

All Atlassian operations route through these 4 MCP tools:

| Tool | HTTP Method | Purpose |
|---|---|---|
| `mcp_tools_fetch` | GET/POST/PUT/PATCH/DELETE | HTTP requests — resource retrieval, creation, modification, deletion |
| `mcp_tools_convert` | — | ADF / Storage Format ↔ Markdown conversion |
| `mcp_tools_auth-check` | — | Authentication status check and optional connectivity test |
| `mcp_tools_setup` | — | Authentication and connection configuration |

## Tool Usage by Skill

| Skill | Tools Used |
|---|---|
| `atlassian-jira` | `mcp_tools_auth-check`, `mcp_tools_fetch` |
| `atlassian-confluence` | `mcp_tools_auth-check`, `mcp_tools_fetch`, `mcp_tools_convert` |
| `atlassian-download` | `mcp_tools_auth-check`, `mcp_tools_fetch` (with `method: "GET"` and `accept_format: "raw"`) |
| `atlassian-setup` | `mcp_tools_auth-check`, `mcp_tools_setup` |

## Multipart Upload

For attachment uploads via `mcp_tools_fetch` with `method: "POST"`:
- `content_type: "multipart/form-data"` — set in tool params
- `X-Atlassian-Token: nocheck` — auto-added by the fetch tool for multipart requests (not caller responsibility)
