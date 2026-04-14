---
name: atlassian-confluence
user_invocable: false
description: "Domain router for Confluence REST API operations — page CRUD, CQL search, space/comment/attachment/label/analytics/user management across Cloud V2, Cloud V1, and Server/DC. Trigger: agent-dispatched only (via confluence agent or direct skill invocation)."
version: "0.1.0"
complexity: complex
plugin: atlassian
---

# atlassian-confluence

Confluence REST API domain router for Claude Code agents. Resolves the correct endpoint, parameters, and MCP tool for any Confluence operation.

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

## Pre-flight

Before starting the work, perform an authentication check. See [`auth-check.md`](../_shared/auth-check.md).

## References

- `../_shared/auth-check.md` — Pre-flight authentication check
- `../_shared/error-handling.md` — HTTP error handling protocol
- `../_shared/environment-detection.md` — Cloud vs Server/DC detection and API versioning
- `../_shared/mcp-tools.md` — Available MCP tools and usage
- `tools/<domain>/schema.md` — Domain-specific endpoint schemas (lazy load on demand)
- `tools/page/hierarchy.md` — Ancestors, descendants, page tree traversal
- `tools/page/version.md` — Version management rules (mandatory `version.number` on update)
- `tools/search/cql-guide.md` — CQL syntax, operators, and examples
