---
name: download
user-invocable: false
description: 'Download and upload file attachments on Jira issues and Confluence pages by direct URL or issue key/page ID lookup, saved under .temp/. Use when asked to download an attachment or "첨부파일 다운로드".'
argument-hint: "<issue-key|page-id|url> [--filename <name>]"
version: "0.1.0"
complexity: simple
plugin: atlassian
---

# download

Unified attachment download for both Jira and Confluence.

## When to Use

- Download attachment by direct URL
- Download attachment by issue key/page ID + filename
- Retrieve image attachment metadata
- Save attachments to local filesystem

## Operations

### Download Attachment

```
Tool: fetch (method: GET)
Params:
  endpoint: <attachment URL or API path>
  service: <jira | confluence>  # required for Confluence links without /wiki/
  accept_format: "raw"
  save_to_path: ".temp/{issueKey}/{filename}"
```

### Get Attachment Metadata (Jira)

```
Tool: fetch (method: GET)
Params:
  endpoint: /rest/api/{version}/issue/{issueKey}
  query_params: { fields: "attachment" }
```

### Get Attachment Metadata (Confluence)

```
Tool: fetch (method: GET)
Params:
  endpoint: /wiki/rest/api/content/{pageId}/child/attachment
```

## Namespace Path Convention

Organize downloads by source context. Every call downloads afresh and overwrites the target — the tool never serves a previously saved file.

| Source                       | save_to_path pattern                    |
| ---------------------------- | --------------------------------------- |
| Jira issue `KAN-27`          | `.temp/KAN-27/<filename>`               |
| Jira issue + comment `10110` | `.temp/KAN-27_comment-10110/<filename>` |
| Confluence page ID `12345`   | `.temp/confluence-12345/<filename>`     |

## Download Flow

1. Derive namespace from source context (issue key, comment ID, page ID)
2. Construct `save_to_path`: `.temp/<namespace>/<filename>`
3. Call fetch — the tool always downloads and overwrites the target file
4. Returns `{ saved_to, size_bytes, content_type }`; `saved_to` is the resolved path under `.temp/`

## Auth Recovery

No pre-flight auth check. Attempt operations directly and handle HTTP 401 per [`auth-check.md`](../.shared/auth-check.md).

## References

- `../.shared/auth-check.md` — Pre-flight authentication check
- `../.shared/error-handling.md` — HTTP error handling protocol
- `../.shared/mcp-tools.md` — Available MCP tools (uses `mcp__plugin_atlassian_tools__fetch` with `method: "GET"` and `accept_format: "raw"`)
- `references/download-flow.md` — Detailed download and upload specs
- `references/errors.md` — Download-specific error handling
