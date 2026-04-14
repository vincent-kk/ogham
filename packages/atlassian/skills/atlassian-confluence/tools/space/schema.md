## Endpoints

| Operation | HTTP | Cloud V1 | Cloud V2 | Server |
|---|---|---|---|---|
| List spaces | GET | `/wiki/rest/api/space` | `/api/v2/spaces` | `/rest/api/space` |
| Get space | GET | `/wiki/rest/api/space/{key}` | `/api/v2/spaces/{id}` | `/rest/api/space/{key}` |

## Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| type | string | N | Filter: global, personal |
| limit | number | N | Results per page |

## MCP Tool Mapping

| Operation | MCP Tool | Method | Notes |
|---|---|---|---|
| All operations | `mcp_tools_fetch` | GET | Read-only |
