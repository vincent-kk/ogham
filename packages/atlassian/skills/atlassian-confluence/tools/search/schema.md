## Endpoints

| Operation | HTTP | Cloud Endpoint | Server Endpoint |
|---|---|---|---|
| CQL Search | GET | `/wiki/rest/api/content/search?cql=...` | `/rest/api/content/search?cql=...` |

## Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| cql | string | Y | CQL query |
| limit | number | N | Results per page (default: 25) |
| start | number | N | Offset for pagination |
| expand | string | N | Fields to expand |

## MCP Tool Mapping

| Operation | MCP Tool | Method | Notes |
|---|---|---|---|
| Search | `fetch` | GET | CQL in query_params |
