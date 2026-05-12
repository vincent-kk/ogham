## Endpoints

V2-style logical paths only — MCP rewrites to `/rest/api/content/...` on Server/DC automatically.

| Operation | HTTP | Endpoint |
|---|---|---|
| Get page | GET | `/pages/{id}` |
| Create page | POST | `/pages` |
| Update page | PUT | `/pages/{id}` |
| Delete page | DELETE | `/pages/{id}` |

## Body Fields

V2-style flat field names. MCP rewrites envelope on DC: `spaceId → space.key`, `parentId → ancestors: [{ id }]`, injects `type: 'page'`, strips V2-only `status`.

| Field | Type | Required | Description |
|---|---|---|---|
| `spaceId` | string | Y (create) | Space identifier — numeric ID for Cloud V2, space key for DC |
| `title` | string | Y (create) | Page title |
| `body` | string | Y (create/update) | Markdown content — pair with `content_format: "markdown"` to auto-convert to storage |
| `version.number` | number | Y (update) | Current version + 1 |
| `parentId` | string | N | Parent page identifier (V2 flat) — auto-converted to V1 `ancestors` on DC |
| `status` | string | N | `current` (V2 only — stripped on DC) |

## MCP Tool Mapping

| Operation | MCP Tool | Method | Notes |
|---|---|---|---|
| Get | `mcp_tools_fetch` | GET | Use V2 query param `body-format=storage` or V1 `expand=body.storage,version` |
| Create | `mcp_tools_fetch` | POST | `content_format: "markdown"` |
| Update | `mcp_tools_fetch` | PUT | Must include `version.number` |
| Delete | `mcp_tools_fetch` | DELETE | Confirm if child pages exist |
