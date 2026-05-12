## Endpoints

User endpoint pluralization differs between V2 and V1/DC. Send the appropriate form per target. (No path-mapper entry — these endpoints are simple enough to keep explicit.)

| Operation | HTTP | Cloud V2 | V1 / Server-DC |
|---|---|---|---|
| Current user | GET | `/users/current` | `/user/current` |
| Search users | GET | — (use search via CQL) | `/search/user?cql=...` |

## Identifier

- **Cloud**: Users identified by `accountId`
- **Server**: Users identified by `userKey` or `username`

## MCP Tool Mapping

| Operation | MCP Tool | Method | Notes |
|---|---|---|---|
| All operations | `mcp_tools_fetch` | GET | Read-only |
