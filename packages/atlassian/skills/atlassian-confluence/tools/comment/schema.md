## Endpoints

| Operation | HTTP | Cloud V1 | Cloud V2 | Server |
|---|---|---|---|---|
| Footer comments | GET | `/wiki/rest/api/content/{id}/child/comment` | `/api/v2/pages/{id}/footer-comments` | `/rest/api/content/{id}/child/comment` |
| Inline comments | GET | — | `/api/v2/pages/{id}/inline-comments` | Not supported |
| Add comment | POST | `/wiki/rest/api/content` | `/api/v2/footer-comments` | `/rest/api/content` |

## Cloud vs Server Branching

- **Inline comments**: Cloud V2 only. Not available on Server.
- **Footer comments**: Both platforms via V1.

## MCP Tool Mapping

| Operation | MCP Tool | Method | Notes |
|---|---|---|---|
| List | `fetch` | GET | |
| Add | `fetch` | POST | content_format: "markdown" |
