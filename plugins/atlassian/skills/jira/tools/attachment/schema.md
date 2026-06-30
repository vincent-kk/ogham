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

| Operation | MCP Tool | Method | Notes |
|---|---|---|---|
| Get metadata | `mcp__plugin_atlassian_tools__fetch` | GET | Via issue fields |
| Upload | `mcp__plugin_atlassian_tools__fetch` | POST | content_type: "multipart/form-data" |
| Download | `mcp__plugin_atlassian_tools__fetch` | GET | accept_format: "raw", use download skill |
