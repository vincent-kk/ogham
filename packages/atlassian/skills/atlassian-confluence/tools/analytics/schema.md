## Endpoints

| Operation | HTTP | Cloud Endpoint | Server Endpoint |
|---|---|---|---|
| Page views | GET | `/wiki/rest/api/analytics/content/{id}/views` | Not supported |

## Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| fromDate | string | N | ISO 8601 start date |
| toDate | string | N | ISO 8601 end date |

**Note**: Analytics API is Cloud-only.

## MCP Tool Mapping

| Operation | MCP Tool | Notes |
|---|---|---|
| Get views | `get` | Cloud only |
