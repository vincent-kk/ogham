## Endpoints

| Operation | HTTP | Cloud Endpoint | Server Endpoint |
|---|---|---|---|
| List comments | GET | `/rest/api/3/issue/{key}/comment` | `/rest/api/2/issue/{key}/comment` |
| Get comment | GET | `/rest/api/3/issue/{key}/comment/{id}` | `/rest/api/2/issue/{key}/comment/{id}` |
| Add comment | POST | `/rest/api/3/issue/{key}/comment` | `/rest/api/2/issue/{key}/comment` |
| Update comment | PUT | `/rest/api/3/issue/{key}/comment/{id}` | `/rest/api/2/issue/{key}/comment/{id}` |
| Delete comment | DELETE | `/rest/api/3/issue/{key}/comment/{id}` | `/rest/api/2/issue/{key}/comment/{id}` |

## Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| body | ADF/string | Y (create) | Comment body. Cloud: ADF. Server: text/wiki |

## Cloud vs Server Branching

- **Cloud**: body is ADF JSON. Use `content_format: "markdown"` for auto-conversion
- **Server**: body is plain text or wiki markup

## MCP Tool Mapping

| Operation | MCP Tool | Method | Notes |
|---|---|---|---|
| List/Get | `fetch` | GET | |
| Add | `fetch` | POST | Use content_format: "markdown" |
| Update | `fetch` | PUT | |
| Delete | `fetch` | DELETE | |

## URL Patterns

| URL Pattern | Route To |
|---|---|
| `...atlassian.net/browse/KAN-27?focusedCommentId=10110` | `GET /rest/api/3/issue/KAN-27/comment/10110` |
| `...atlassian.net/browse/KAN-27?focusedId=10110` | `GET /rest/api/3/issue/KAN-27/comment/10110` |
