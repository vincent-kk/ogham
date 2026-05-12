## Endpoints

Labels live on the V1 content endpoint on both Cloud V1 and Server/DC. Cloud V2 exposes read via `/pages/{id}/labels` but no write — send to `/content/{id}/label` for cross-platform parity.

| Operation | HTTP | Endpoint |
|---|---|---|
| List labels (V2 read) | GET | `/pages/{id}/labels` |
| Add labels | POST | `/content/{id}/label` |
| Remove label | DELETE | `/content/{id}/label/{label}` |

## MCP Tool Mapping

| Operation | MCP Tool | Method | Notes |
|---|---|---|---|
| Get | `mcp_tools_fetch` | GET | |
| Add | `mcp_tools_fetch` | POST | Body: `[{ "name": "label" }]` |
| Remove | `mcp_tools_fetch` | DELETE | |
