## Endpoints

CQL search uses the V1 content-search endpoint on both Cloud and Server/DC (Atlassian kept the v1 search alive even after v1 deprecation). Send the V1 path directly — no V2 logical equivalent.

| Operation | HTTP | Endpoint |
|---|---|---|
| CQL Search | GET | `/content/search?cql=...` |

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
| Search | `mcp__plugin_atlassian_tools__fetch` | GET | CQL in `query_params` |
