## Endpoints

| Operation | HTTP | Cloud Endpoint | Server Endpoint |
|---|---|---|---|
| Get labels | GET | `/wiki/rest/api/content/{id}/label` | `/rest/api/content/{id}/label` |
| Add labels | POST | `/wiki/rest/api/content/{id}/label` | `/rest/api/content/{id}/label` |
| Remove label | DELETE | `/wiki/rest/api/content/{id}/label/{label}` | `/rest/api/content/{id}/label/{label}` |

## MCP Tool Mapping

| Operation | MCP Tool | Method | Notes |
|---|---|---|---|
| Get | `mcp_tools_fetch` | GET | |
| Add | `mcp_tools_fetch` | POST | Body: [{ "name": "label" }] |
| Remove | `mcp_tools_fetch` | DELETE | |
