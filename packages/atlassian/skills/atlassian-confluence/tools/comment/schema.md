## Endpoints

V2-style logical paths only — MCP rewrites to V1/DC form (including `type: 'comment'` injection on POST).

| Operation | HTTP | Endpoint |
|---|---|---|
| List footer comments | GET | `/pages/{id}/footer-comments` |
| List inline comments | GET | `/pages/{id}/inline-comments` (Cloud V2 only — DC returns explicit error) |
| Add footer comment | POST | `/footer-comments` |

## MCP Tool Mapping

| Operation | MCP Tool | Method | Notes |
|---|---|---|---|
| List | `mcp_tools_fetch` | GET | |
| Add | `mcp_tools_fetch` | POST | `content_format: "markdown"`. Body: `{ body: "markdown", pageId: "{id}" }` — MCP auto-converts `pageId` → V1 `container: { id, type: 'page' }` on DC, and injects `type: 'comment'` |
