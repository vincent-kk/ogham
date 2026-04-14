---
name: atlassian-confluence
user_invocable: false
description: "Domain router for Confluence REST API operations — page CRUD, CQL search, space/comment/attachment/label/analytics/user management across Cloud V2, Cloud V1, and Server/DC. Main agent executes directly for simple operations; confluence agent spawned only for complex multi-step workflows."
version: "0.1.0"
complexity: complex
plugin: atlassian
---

# atlassian-confluence

Confluence REST API domain router. Resolves the correct endpoint, parameters, and MCP tool for any Confluence operation.

## Execution Model

**Main agent executes directly** for simple operations:
- Single page read (`GET /api/v2/pages/{id}` or `/rest/api/content/{id}`)
- Single CQL search
- Single comment read/add
- Single label add/remove
- Single attachment download

**Spawn `confluence` agent** only for complex multi-step workflows:
- Multi-page operations (bulk create/update, page tree manipulation)
- Version conflict resolution chains (fetch → increment → retry on 409)
- Cross-domain chained operations (create page + attach + label + comment)
- Storage format troubleshooting (400 errors from malformed XHTML)

### Direct Execution Steps (Main Agent)

1. Read `tools/<domain>/schema.md` for the needed domain
2. Call `mcp__plugin_atlassian_tools__fetch` with the correct HTTP method and endpoint
3. Use `content_format: "markdown"` when sending page body content (auto-converts to Storage Format)
4. On 401: invoke `atlassian-setup` skill, then retry once

## When to Use

- Create, read, update, or delete Confluence pages
- Search Confluence content with CQL
- Manage spaces, comments, attachments, and labels
- Look up user information or page analytics

## Tool Domains

| Domain | Description |
|---|---|
| `page` | Page CRUD, hierarchy navigation, and version management |
| `search` | CQL-based full-text and metadata search across spaces |
| `space` | Space listing, metadata retrieval, and space lookup |
| `comment` | Footer comments and inline comments (inline is Cloud-only via V2) |
| `attachment` | Upload and download file attachments on pages |
| `label` | Add, list, and remove labels on pages |
| `analytics` | Page view statistics — Cloud only |
| `user` | Current user info and user search by account ID or query |

## Routing Protocol

1. Identify the domain from the user's request (page / search / space / etc.)
2. Read `tools/<domain>/schema.md` ONLY when needed — do not preload all schemas
3. Select the correct endpoint variant: Cloud V2 preferred, fall back to V1 if V2 unavailable
4. Call the appropriate MCP tool with resolved parameters
5. On HTTP 401: invoke `atlassian-setup` skill, then retry once

## Permission Boundaries

- Read operations: require `read:confluence-content.all` scope (Cloud) or View permission (Server/DC)
- Write operations: require `write:confluence-content` scope (Cloud) or Edit permission (Server/DC)
- Admin operations (space management): require `manage:confluence-configuration` (Cloud)
- Analytics: Cloud only — requires analytics feature enabled on instance

## Auth Recovery

No pre-flight auth check. Attempt operations directly and handle HTTP 401 per [`auth-check.md`](../_shared/auth-check.md).

## References

- `../_shared/auth-check.md` — Pre-flight authentication check
- `../_shared/error-handling.md` — HTTP error handling protocol
- `../_shared/environment-detection.md` — Cloud vs Server/DC detection and API versioning
- `../_shared/mcp-tools.md` — Available MCP tools and usage
- `tools/<domain>/schema.md` — Domain-specific endpoint schemas (lazy load on demand)
- `tools/page/hierarchy.md` — Ancestors, descendants, page tree traversal
- `tools/page/version.md` — Version management rules (mandatory `version.number` on update)
- `tools/search/cql-guide.md` — CQL syntax, operators, and examples
