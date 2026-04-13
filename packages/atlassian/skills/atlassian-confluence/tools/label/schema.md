## Endpoints

| Operation | HTTP | Cloud Endpoint | Server Endpoint |
|---|---|---|---|
| Get labels | GET | `/wiki/rest/api/content/{id}/label` | `/rest/api/content/{id}/label` |
| Add labels | POST | `/wiki/rest/api/content/{id}/label` | `/rest/api/content/{id}/label` |
| Remove label | DELETE | `/wiki/rest/api/content/{id}/label/{label}` | `/rest/api/content/{id}/label/{label}` |

## MCP Tool Mapping

| Operation | MCP Tool | Notes |
|---|---|---|
| Get | `get` | |
| Add | `post` | Body: [{ "name": "label" }] |
| Remove | `delete` | |
