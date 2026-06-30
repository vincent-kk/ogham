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
| List | `mcp__plugin_atlassian_tools__fetch` | GET | |
| Upload | `mcp__plugin_atlassian_tools__fetch` | POST | `content_type: "multipart/form-data"` (XSRF header auto-attached) |
| Delete | `mcp__plugin_atlassian_tools__fetch` | DELETE | |
| Download | `mcp__plugin_atlassian_tools__fetch` | GET | `accept_format: "raw"`, prefer `download` skill |
