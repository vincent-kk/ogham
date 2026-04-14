## Endpoints

| Operation | HTTP | Cloud Endpoint | Server Endpoint |
|---|---|---|---|
| Search (JQL) | POST | `/rest/api/3/search/jql` | — |
| Search (JQL) | GET | — | `/rest/api/2/search?jql=...` |

## Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| jql | string | Y | JQL query string |
| fields | string[] | N | Fields to include |
| maxResults | number | N | Page size (default: 50) |
| startAt | number | N | Offset (Server only) |
| nextPageToken | string | N | Cursor (Cloud only) |

## Cloud vs Server Branching

- **Cloud**: POST with JQL in body, cursor-based pagination
- **Server**: GET with JQL in query param, offset-based pagination

## MCP Tool Mapping

| Operation | MCP Tool | Method | Notes |
|---|---|---|---|
| Search (Cloud) | `fetch` | POST | JQL in request body |
| Search (Server) | `fetch` | GET | JQL in query_params |
