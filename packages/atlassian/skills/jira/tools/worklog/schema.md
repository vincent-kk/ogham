## Endpoints

| Operation | HTTP | Cloud Endpoint | Server Endpoint |
|---|---|---|---|
| List worklogs | GET | `/rest/api/3/issue/{key}/worklog` | `/rest/api/2/issue/{key}/worklog` |
| Add worklog | POST | `/rest/api/3/issue/{key}/worklog` | `/rest/api/2/issue/{key}/worklog` |

## Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| timeSpentSeconds | number | Y | Time in seconds |
| started | string | Y | ISO 8601 datetime |
| comment | ADF/string | N | Worklog comment |

## MCP Tool Mapping

| Operation | MCP Tool | Method | Notes |
|---|---|---|---|
| List | `mcp_tools_fetch` | GET | |
| Add | `mcp_tools_fetch` | POST | |
