## Endpoints

Analytics is Cloud-only. MCP raises an explicit error on Server/DC.

| Operation | HTTP | Endpoint |
|---|---|---|
| Page views | GET | `/analytics/content/{id}/views` |

## Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| fromDate | string | N | ISO 8601 start date |
| toDate | string | N | ISO 8601 end date |

## MCP Tool Mapping

| Operation | MCP Tool | Method | Notes |
|---|---|---|---|
| Get views | `mcp__plugin_atlassian_tools__fetch` | GET | Cloud only — DC returns "Cloud V2 only" error |
