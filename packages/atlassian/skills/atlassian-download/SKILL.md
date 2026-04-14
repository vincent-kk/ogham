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

## Download Flow

1. Resolve attachment URL (direct URL or metadata lookup)
2. Auth header injected automatically by MCP layer
3. HTTP GET with `accept_format: "raw"`
4. Save to file (target path or temp directory)
5. Return: file path, size, MIME type

## Pre-flight

작업 시작 전 인증 확인을 수행한다. [`auth-check.md`](../_shared/auth-check.md) 참조.

## References

- `../_shared/auth-check.md` — Pre-flight authentication check
- `../_shared/error-handling.md` — HTTP error handling protocol
- `../_shared/mcp-tools.md` — Available MCP tools (uses `fetch` with `method: "GET"` and `accept_format: "raw"`)
- `references/download-flow.md` — Detailed download and upload specs
- `references/errors.md` — Download-specific error handling
