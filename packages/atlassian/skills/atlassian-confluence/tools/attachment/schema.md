## Endpoints

V2-style logical paths — MCP rewrites to `/content/{id}/child/attachment` on Server/DC.

| Operation | HTTP | Endpoint |
|---|---|---|
| List | GET | `/pages/{id}/attachments` |
| Upload | POST | `/pages/{id}/attachments` |
| Delete | DELETE | `/attachments/{id}` (Cloud V2). V1/DC: `/content/{attachmentId}` — send directly. |
| Download | GET | Via download link returned from list/get |

## MCP Tool Mapping

| Operation | MCP Tool | Method | Notes |
|---|---|---|---|
| List | `mcp_tools_fetch` | GET | |
| Upload | `mcp_tools_fetch` | POST | `content_type: "multipart/form-data"` (XSRF header auto-attached) |
| Delete | `mcp_tools_fetch` | DELETE | |
| Download | `mcp_tools_fetch` | GET | `accept_format: "raw"`, prefer `atlassian-download` skill |
