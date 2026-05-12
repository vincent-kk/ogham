## Endpoints

V2-style logical paths — MCP rewrites `/users/current` to `/user/current` on DC.

| Operation | HTTP | Endpoint |
|---|---|---|
| Current user | GET | `/users/current` |
| Search users | GET | `/search/user?cql=...` (V1/DC only — Cloud V2 has no equivalent; use CQL search instead) |

## Identifier

- **Cloud**: Users identified by `accountId`
- **Server**: Users identified by `userKey` or `username`

## MCP Tool Mapping

| Operation | MCP Tool | Method | Notes |
|---|---|---|---|
| All operations | `mcp_tools_fetch` | GET | Read-only |
