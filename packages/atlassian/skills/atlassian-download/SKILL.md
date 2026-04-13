---
name: atlassian-download
description: "Download attachments and images from Jira issues and Confluence pages. Supports direct URL and metadata-based download."
---

# atlassian-download

Unified attachment download for both Jira and Confluence.

## When to Use

- Download attachment by direct URL
- Download attachment by issue key/page ID + filename
- Retrieve image attachment metadata
- Save attachments to local filesystem

## MCP Tools Used

- `get` — HTTP GET with `accept_format: "raw"` for binary downloads

## Operations

### Download Attachment

```
Tool: get
Params:
  endpoint: <attachment URL or API path>
  accept_format: "raw"
```

### Get Attachment Metadata (Jira)

```
Tool: get
Params:
  endpoint: /rest/api/{version}/issue/{issueKey}
  query_params: { fields: "attachment" }
```

### Get Attachment Metadata (Confluence)

```
Tool: get
Params:
  endpoint: /rest/api/content/{pageId}/child/attachment
```

## Download Flow

1. Resolve attachment URL (direct URL or metadata lookup)
2. Auth header injected automatically by MCP layer
3. HTTP GET with `accept_format: "raw"`
4. Save to file (target path or temp directory)
5. Return: file path, size, MIME type

## Multipart Upload Headers

For upload operations (via `post` tool):
- `X-Atlassian-Token: nocheck` — CSRF bypass (required)
- `Content-Type: multipart/form-data` — boundary auto-set

## References

- `references/download-flow.md` — Detailed download and upload specs
- `references/errors.md` — Download-specific error handling
