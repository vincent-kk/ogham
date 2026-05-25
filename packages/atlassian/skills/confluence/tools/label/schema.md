## Endpoints

V2-style logical paths — MCP rewrites `/pages/{id}/labels` to `/content/{id}/label` on DC. Cloud V2 has only GET on the labels endpoint; POST/DELETE writes will surface as 404/405 from the V2 API on Cloud — use update-via-page or call the V1 path directly on Cloud V1 if needed.

| Operation | HTTP | Endpoint |
|---|---|---|
| List labels | GET | `/pages/{id}/labels` |
| Add labels | POST | `/pages/{id}/labels` (DC only — Cloud V2 has no write) |
| Remove label | DELETE | `/pages/{id}/labels/{label}` (DC only) |

## MCP Tool Mapping

| Operation | MCP Tool | Method | Notes |
|---|---|---|---|
| Get | `mcp_tools_fetch` | GET | |
| Add | `mcp_tools_fetch` | POST | Body: `[{ "name": "label" }]` |
| Remove | `mcp_tools_fetch` | DELETE | |
