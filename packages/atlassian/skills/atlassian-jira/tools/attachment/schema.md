## Endpoints

| Operation | HTTP | Cloud Endpoint | Server Endpoint |
|---|---|---|---|
| Get metadata | GET | `/rest/api/3/issue/{key}?fields=attachment` | `/rest/api/2/issue/{key}?fields=attachment` |
| Upload | POST | `/rest/api/3/issue/{key}/attachments` | `/rest/api/2/issue/{key}/attachments` |

## Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| file | binary | Y (upload) | File content |
| X-Atlassian-Token | header | Y (upload) | Must be "nocheck" |

## MCP Tool Mapping

| Operation | MCP Tool | Notes |
|---|---|---|
| Get metadata | `get` | Via issue fields |
| Upload | `post` | content_type: "multipart/form-data" |
| Download | `get` | accept_format: "raw", use atlassian-download skill |
