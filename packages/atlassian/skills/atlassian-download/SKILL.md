---
name: atlassian-download
user_invocable: true
description: "[atlassian:atlassian-download] Download and upload file attachments from Jira issues and Confluence pages by direct URL or issue key/page ID metadata lookup. Trigger: \"download attachment\", \"첨부파일 다운로드\", \"파일 받기\", \"atlassian download\""
argument-hint: "<issue-key|page-id|url> [--filename <name>]"
version: "0.1.0"
complexity: simple
plugin: atlassian
---

# atlassian-download

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
  accept_format: "raw"
  save_to_path: "/path/to/save/filename.ext"
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

Organize downloads by source context. The directory structure serves as a cache — if the target file already exists, the fetch tool returns it immediately without re-downloading.

| Source | save_to_path pattern |
|--------|---------------------|
| Jira issue `KAN-27` | `.temp/KAN-27/<filename>` |
| Jira issue + comment `10110` | `.temp/KAN-27_comment-10110/<filename>` |
| Confluence page ID `12345` | `.temp/confluence-12345/<filename>` |

To force re-download when a cached file exists, pass `force: true`.

## Download Flow

1. Derive namespace from source context (issue key, comment ID, page ID)
2. Construct `save_to_path`: `.temp/<namespace>/<filename>`
3. Call fetch — tool auto-checks cache (skips download if file exists)
4. If cached: returns `{ saved_to, size_bytes, cached: true }`
5. If not cached: downloads, saves, returns `{ saved_to, size_bytes, content_type }`

## Auth Recovery

No pre-flight auth check. Attempt operations directly and handle HTTP 401 per [`auth-check.md`](../_shared/auth-check.md).

## References

- `../_shared/auth-check.md` — Pre-flight authentication check
- `../_shared/error-handling.md` — HTTP error handling protocol
- `../_shared/mcp-tools.md` — Available MCP tools (uses `fetch` with `method: "GET"` and `accept_format: "raw"`)
- `references/download-flow.md` — Detailed download and upload specs
- `references/errors.md` — Download-specific error handling
