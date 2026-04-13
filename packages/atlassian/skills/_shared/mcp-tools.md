# MCP Tools

All Atlassian operations route through these 6 MCP tools:

| Tool | HTTP Method | Purpose |
|---|---|---|
| `get` | GET | Read operations — retrieve resources, search, list |
| `post` | POST | Create operations — new resources, bulk create |
| `put` | PUT | Update operations — modify existing resources |
| `delete` | DELETE | Delete operations — remove resources |
| `convert` | — | ADF / Storage Format ↔ Markdown conversion |
| `setup` | — | Authentication and connection configuration |

## Tool Usage by Skill

| Skill | Tools Used |
|---|---|
| `atlassian-jira` | `get`, `post`, `put`, `delete` |
| `atlassian-confluence` | `get`, `post`, `put`, `delete`, `convert` |
| `atlassian-download` | `get` (with `accept_format: "raw"` for binary) |
| `atlassian-setup` | `setup` |

## Multipart Upload

For attachment uploads via `post`:
- `content_type: "multipart/form-data"` — set in tool params
- `X-Atlassian-Token: nocheck` — auto-added by the post tool for multipart requests (not caller responsibility)
