---
name: download
user-invocable: false
description: 'Download a Jira or Confluence attachment to .temp/ by direct URL, issue key + filename, or page id + filename. Use for "download the attachment" in any language; upload is not supported.'
argument-hint: "<issue-key|page-id|url> [--filename <name>]"
version: "0.2.1"
complexity: simple
plugin: atlassian
---

# download

One `mcp__plugin_atlassian_tools__fetch` call per file: `method: "GET"`, `accept_format: "raw"`, `save_to_path: ".temp/<namespace>/<filename>"`. Parameters: [`mcp-tools.md`](../.shared/mcp-tools.md).

## Namespace

| Source                     | `save_to_path`                          |
| -------------------------- | --------------------------------------- |
| Jira issue `KAN-27`        | `.temp/KAN-27/<filename>`               |
| Jira comment `10110` on it | `.temp/KAN-27_comment-10110/<filename>` |
| Confluence page `12345`    | `.temp/confluence-12345/<filename>`     |

Every call downloads afresh and overwrites the target; there is no cache. The result is `data: { saved_to, size_bytes, content_type }` — use `saved_to` (absolute) in later steps rather than rebuilding the path.

## Resolving the URL

- **Direct URL** (`…/secure/attachment/{id}/{name}`, `…/wiki/download/attachments/{pageId}/{name}`, `…/rest/api/3/attachment/content/{id}`): pass it as `endpoint` verbatim. Add `service: "confluence"` for Confluence links that lack `/wiki/`.
- **Jira issue + filename**: `GET /issue/{key}` with `query_params: { fields: "attachment" }`, find the entry in `fields.attachment[]` by `filename`, download its `content` URL. On Server/DC prefer `content` (`/secure/attachment/…`) over `/rest/api/2/attachment/content/{id}`, which some versions lack.
- **Confluence page + filename**: `GET /pages/{pageId}/attachments` with `service: "confluence"`, match `title`, download `downloadLink` (Cloud) or `_links.download` (DC). Relative `/download/attachments/…` links work as-is on both deployments.

## Errors

401 → [`error-handling.md`](../.shared/error-handling.md#401-recovery). 403 → the user lacks browse/view permission on the container; do not retry. 404 on a rest attachment-content URL on Server/DC → fall back to the `content` URL from issue metadata. Other statuses → [`error-handling.md`](../.shared/error-handling.md).

## Upload

Not supported — the fetch tool has no multipart encoding. Tell the user to attach files in the Jira/Confluence UI.
