## Endpoints

| Operation | HTTP | Cloud Endpoint | Server Endpoint |
|---|---|---|---|
| Current user | GET | `/rest/api/3/myself` | `/rest/api/2/myself` |
| Search users | GET | `/rest/api/3/user/search?query={q}` | `/rest/api/2/user/search?username={q}` |
| Get user | GET | `/rest/api/3/user?accountId={id}` | `/rest/api/2/user?key={key}` |

## Cloud vs Server Branching

- **Cloud**: Users identified by `accountId`
- **Server**: Users identified by `name` or `key`

## MCP Tool Mapping

| Operation | MCP Tool | Method | Notes |
|---|---|---|---|
| All operations | `fetch` | GET | Read-only |
