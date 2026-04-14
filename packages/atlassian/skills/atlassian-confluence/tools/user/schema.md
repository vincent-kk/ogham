## Endpoints

| Operation | HTTP | Cloud V1 | Cloud V2 | Server |
|---|---|---|---|---|
| Current user | GET | `/wiki/rest/api/user/current` | `/api/v2/users/current` | `/rest/api/user/current` |
| Search users | GET | `/wiki/rest/api/search/user?cql=...` | — | `/rest/api/search/user?cql=...` |

## Cloud vs Server Branching

- **Cloud**: Users identified by `accountId`
- **Server**: Users identified by `userKey` or `username`

## MCP Tool Mapping

| Operation | MCP Tool | Method | Notes |
|---|---|---|---|
| All operations | `mcp_tools_fetch` | GET | Read-only |
