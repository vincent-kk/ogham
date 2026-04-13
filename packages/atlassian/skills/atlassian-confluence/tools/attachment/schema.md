## Endpoints

| Operation | HTTP | Cloud V1 | Cloud V2 | Server |
|---|---|---|---|---|
| List | GET | `/rest/api/content/{id}/child/attachment` | `/api/v2/pages/{id}/attachments` | `/rest/api/content/{id}/child/attachment` |
| Upload | POST | `/rest/api/content/{id}/child/attachment` | `/api/v2/pages/{id}/attachments` | `/rest/api/content/{id}/child/attachment` |
| Delete | DELETE | `/rest/api/content/{attachmentId}` | `/api/v2/attachments/{id}` | `/rest/api/content/{attachmentId}` |
| Download | GET | Via download link | Via download link | Via download link |

## MCP Tool Mapping

| Operation | MCP Tool | Notes |
|---|---|---|
| List | `get` | |
| Upload | `post` | content_type: "multipart/form-data" |
| Delete | `delete` | |
| Download | `get` | accept_format: "raw", use atlassian-download |
