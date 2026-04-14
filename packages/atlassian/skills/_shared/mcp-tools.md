# MCP Tools

All Atlassian operations route through these 4 MCP tools:

| Tool | HTTP Method | Purpose |
|---|---|---|
| `fetch` | GET/POST/PUT/PATCH/DELETE | HTTP requests — resource retrieval, creation, modification, deletion |
| `convert` | — | ADF / Storage Format ↔ Markdown conversion |
| `auth-check` | — | Authentication status check and optional connectivity test |
| `setup` | — | Authentication and connection configuration |

## Tool Usage by Skill

| Skill | Tools Used |
|---|---|
| `atlassian-jira` | `auth-check`, `fetch` |
| `atlassian-confluence` | `auth-check`, `fetch`, `convert` |
| `atlassian-download` | `auth-check`, `fetch` (with `method: "GET"` and `accept_format: "raw"`) |
| `atlassian-setup` | `auth-check`, `setup` |

## Multipart Upload

For attachment uploads via `fetch` with `method: "POST"`:
- `content_type: "multipart/form-data"` — set in tool params
- `X-Atlassian-Token: nocheck` — auto-added by the fetch tool for multipart requests (not caller responsibility)
