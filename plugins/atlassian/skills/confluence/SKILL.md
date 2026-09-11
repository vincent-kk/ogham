---
name: confluence
user-invocable: true
description: "Confluence REST API router — page CRUD and hierarchy, CQL search, spaces, footer/inline comments, labels, attachment listing, analytics, user lookup on Cloud and Server/DC. Use for any Confluence request or Confluence page URL; attachment downloads go to the download skill."
version: "0.2.1"
complexity: complex
plugin: atlassian
---

# confluence

Resolves a Confluence request to an endpoint and an `mcp__plugin_atlassian_tools__fetch` call. Parameters: [`mcp-tools.md`](../.shared/mcp-tools.md). Errors: [`error-handling.md`](../.shared/error-handling.md).

## Execution model

Execute directly for single-call work (one page, one search, one comment, one label change). Spawn the `confluence` agent for multi-page work (bulk create/update, tree moves), chains across domains (create + label + comment), or repeated 409/400 recovery.

## Call contract

1. Read `tools/<domain>/schema.md` for the domain in play — nothing else up front.
2. **Every call carries `service: "confluence"`.** When omitted, only paths containing `/wiki/` or `/download/attachments/`, or starting with `/api/v2/`, are detected as Confluence; everything else, including logical `/pages/{id}` and `/spaces`, goes to Jira.
3. Send V2-style logical paths for supported operations; use [Endpoint routing](#endpoint-routing) for deployment rules. Operations that only exist in V1 (CQL search, labels write, user lookup, DC-only endpoints) use the full path each schema gives.
4. Send page/comment bodies as Markdown with `content_format: "markdown"`; it becomes the storage-format envelope for the deployment. Reading: ask for `body-format=storage` (Cloud) or `expand=body.storage` (DC) and convert with `mcp__plugin_atlassian_tools__convert` (`storage` → `markdown`) when the user needs text.
5. Page update needs the current `version.number + 1`; 409 → re-read and resend, at most 3 times.
6. Recovery for other statuses follows [`error-handling.md`](../.shared/error-handling.md#errors).

## Endpoint routing

Deployment is decided by hostname: `*.atlassian.net` → Cloud, anything else → Server/DC. The stored site config carries the result; branch only where these rules require it.

| Path shape                                              | Cloud                        | Server/DC                            |
| ------------------------------------------------------- | ---------------------------- | ------------------------------------ |
| Logical `/pages/{id}`, `/spaces`, `/footer-comments`, … | `/wiki/api/v2` + path        | `/rest/api` + rewritten path (below) |
| Starts with `/rest/`, `/wiki/`, `/secure/`, `/plugins/` | Verbatim                     | Verbatim                             |
| Starts with `/download/`                                | `/wiki` + path               | Verbatim                             |
| Absolute URL of a configured site                       | Base stripped, then as above | Same                                 |

Cloud V1 endpoints are written in full: `/wiki/rest/api/…`; a bare `/rest/api/…` leaves the site root without `/wiki`. On Server/DC, V1 paths start with `/rest/api/…`.

Confluence Cloud `base_url` is the site root (`https://x.atlassian.net`), without `/wiki`; including it makes every call `/wiki/wiki/…`. A DC context path (e.g. `https://host/confluence`) lives in `base_url` only; never repeat it in the endpoint.

### Server/DC rewriting

Applied only to `service: "confluence"` on Server/DC, before the `/rest/api` prefix. Matching is by exact segment count.

| Logical (V2)                        | DC (V1)                             |
| ----------------------------------- | ----------------------------------- |
| `/pages` · `/footer-comments`       | `/content`                          |
| `/pages/{id}` · `/attachments/{id}` | `/content/{id}`                     |
| `/pages/{id}/children`              | `/content/{id}/child/page`          |
| `/pages/{id}/descendants`           | `/content/{id}/descendant/page`     |
| `/pages/{id}/footer-comments`       | `/content/{id}/child/comment`       |
| `/pages/{id}/attachments`           | `/content/{id}/child/attachment`    |
| `/pages/{id}/labels`                | `/content/{id}/label`               |
| `/pages/{id}/properties`            | `/content/{id}/property`            |
| `/pages/{id}/versions`              | `/content/{id}/version`             |
| `/pages/{id}/move/{pos}/{target}`   | `/content/{id}/move/{pos}/{target}` |
| `/spaces` · `/spaces/{id}`          | `/space` · `/space/{id}`            |
| `/users/current`                    | `/user/current`                     |

Body rewriting on DC (every matched logical route, any method): `spaceId → space.key`, `parentId → ancestors: [{ id }]`, `pageId → container: { id, type: "page" }` (footer-comments only), `status` dropped, and the body object is shallow-copied (an array body becomes an object). `type: "page" | "comment"` is injected only on POST to `/pages` and `/footer-comments`.

- V2-only prefixes `/inline-comments`, `/whiteboards`, `/databases`, `/embeds`, `/analytics` are rejected on DC with an explicit error.
- Any other unmatched logical path (e.g. `/pages/{id}/labels/{label}`, `/pages/{id}/inline-comments`) is sent as `/rest/api/<path>` and 404s — use the V1 form directly on DC.

Cloud-only: inline comments, analytics, whiteboards/databases/embeds.

## Domains

| Domain       | Covers                                                         |
| ------------ | -------------------------------------------------------------- |
| `page`       | Page CRUD, children/ancestors/descendants, move, versions      |
| `search`     | CQL search (V1 on both deployments)                            |
| `space`      | Space list/get — numeric id on Cloud, key on Server/DC         |
| `comment`    | Footer comments; inline comments Cloud only                    |
| `attachment` | List/delete; download via `download` skill; upload unsupported |
| `label`      | List (logical) / add, remove (V1 paths)                        |
| `analytics`  | Page views — Cloud only                                        |
| `user`       | Current user, user search (V1 paths)                           |

## Identity and deployment

Cloud identifies users by `accountId`; Server/DC by `userKey`/`username`. Confluence page URLs: `/wiki/spaces/{KEY}/pages/{id}/…` (Cloud) or `/pages/viewpage.action?pageId={id}` (DC) → page id.
