## Endpoints

V2-style logical paths — MCP rewrites to V1/DC form automatically.

| Operation | HTTP | Endpoint |
|---|---|---|
| List | GET | `/pages/{id}/attachments` |
| Upload | POST | `/pages/{id}/attachments` |
| Delete | DELETE | `/attachments/{attachmentId}` (MCP rewrites to `/content/{attachmentId}` on DC) |
| Download | GET | Via download link returned from list/get |

## MCP Tool Mapping

| Operation | MCP Tool | Method | Notes |
|---|---|---|---|
| List | `mcp_tools_fetch` | GET | |
| Upload | `mcp_tools_fetch` | POST | `content_type: "multipart/form-data"` (XSRF header auto-attached) |
| Delete | `mcp_tools_fetch` | DELETE | |
| Download | `mcp_tools_fetch` | GET | `accept_format: "raw"`, prefer `atlassian-download` skill |
