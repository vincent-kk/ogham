## Endpoints

| Operation | HTTP | Cloud Endpoint | Server Endpoint |
|---|---|---|---|
| Get transitions | GET | `/rest/api/3/issue/{key}/transitions` | `/rest/api/2/issue/{key}/transitions` |
| Do transition | POST | `/rest/api/3/issue/{key}/transitions` | `/rest/api/2/issue/{key}/transitions` |

## Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| issueIdOrKey | string | Y | Issue key or ID |
| transition.id | string | Y | Transition ID (for POST) |
| fields | object | N | Required fields for transition |
| update | object | N | Update operations |

## MCP Tool Mapping

| Operation | MCP Tool | Method | Notes |
|---|---|---|---|
| Get transitions | `fetch` | GET | Query available transitions first |
| Do transition | `fetch` | POST | Must include transition.id |
