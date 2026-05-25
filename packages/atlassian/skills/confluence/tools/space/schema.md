## Endpoints

V2-style logical paths only — MCP rewrites to `/space` on Server/DC.

| Operation | HTTP | Endpoint |
|---|---|---|
| List spaces | GET | `/spaces` |
| Get space | GET | `/spaces/{id}` |

In the `{id}` segment, send the **numeric space ID for Cloud V2** or the **space key for Server/DC**. MCP does not auto-translate between the two — the identifier the user already knows is passed verbatim.

## Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| type | string | N | Filter: global, personal |
| limit | number | N | Results per page |

## MCP Tool Mapping

| Operation | MCP Tool | Method | Notes |
|---|---|---|---|
| All operations | `mcp_tools_fetch` | GET | Read-only |
