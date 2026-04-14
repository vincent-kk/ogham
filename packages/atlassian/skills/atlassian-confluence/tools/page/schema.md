## Endpoints

| Operation | HTTP | Cloud V1 | Cloud V2 | Server |
|---|---|---|---|---|
| Get page | GET | `/wiki/rest/api/content/{id}` | `/api/v2/pages/{id}` | `/rest/api/content/{id}` |
| Create page | POST | `/wiki/rest/api/content` | `/api/v2/pages` | `/rest/api/content` |
| Update page | PUT | `/wiki/rest/api/content/{id}` | `/api/v2/pages/{id}` | `/rest/api/content/{id}` |
| Delete page | DELETE | `/wiki/rest/api/content/{id}` | `/api/v2/pages/{id}` | `/rest/api/content/{id}` |

## Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| spaceKey/spaceId | string | Y (create) | Space identifier |
| title | string | Y (create) | Page title |
| body | object | Y (create/update) | Page content (Storage Format) |
| version.number | number | Y (update) | Current version + 1 |
| ancestors | array | N | Parent page for hierarchy |

## Cloud vs Server Branching

- **Cloud**: V2 preferred (`/api/v2/pages/`). Falls back to V1.
- **Server**: V1 only (`/rest/api/content/`)

## MCP Tool Mapping

| Operation | MCP Tool | Method | Notes |
|---|---|---|---|
| Get | `fetch` | GET | expand=body.storage,version |
| Create | `fetch` | POST | content_format: "markdown" |
| Update | `fetch` | PUT | Must include version.number |
| Delete | `fetch` | DELETE | Confirm if child pages exist |
