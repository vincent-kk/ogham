# Download Flow Reference

## Namespace Path Convention

Derive save path from the source context to enable filesystem-based caching:

| Source               | Namespace                        | Example save_to_path                  |
| -------------------- | -------------------------------- | ------------------------------------- |
| Jira issue           | `{issueKey}`                     | `.temp/KAN-27/screenshot.png`         |
| Jira issue + comment | `{issueKey}_comment-{commentId}` | `.temp/KAN-27_comment-10110/demo.mp4` |
| Confluence page      | `confluence-{pageId}`            | `.temp/confluence-12345/diagram.png`  |

The fetch tool checks if the target file exists before downloading. If it exists, returns `{ saved_to, size_bytes, cached: true }` without making an HTTP request. Pass `force: true` to bypass cache.

## Jira Attachment Download

### By Issue Key + Filename

1. Fetch issue: `GET /rest/api/{version}/issue/{key}?fields=attachment`
2. Find attachment by filename in `fields.attachment[]`
3. Download via `attachment.content` URL with `accept_format: "raw"`, `save_to_path: ".temp/{issueKey}/<filename>"`

### By Direct URL

1. Use the attachment content URL directly
2. `GET {url}` with `accept_format: "raw"`, `save_to_path: ".temp/{namespace}/<filename>"`

## Confluence Attachment Download

Pass `service: "confluence"` on every call in this section — Confluence paths without `/wiki/` are otherwise routed to Jira.

### By Page ID (Cloud)

1. List attachments: `GET /pages/{pageId}/attachments` (logical path — auto-prefixed to `/wiki/api/v2/...`)
2. Download via the `downloadLink` value with `accept_format: "raw"` (relative `/download/attachments/...` links work as-is)

### By Page ID (Server/DC)

1. List attachments: `GET /rest/api/content/{pageId}/child/attachment`
2. Download via the `_links.download` value with `accept_format: "raw"`

## Upload Flow

### Jira Attachment Upload

```
Tool: fetch (method: POST)
Params:
  endpoint: /rest/api/{version}/issue/{key}/attachments
  content_type: "multipart/form-data"
  body: <file data>
```

### Confluence Attachment Upload

```
Tool: fetch (method: POST)
Params:
  endpoint: /rest/api/content/{pageId}/child/attachment
  service: confluence
  content_type: "multipart/form-data"
  body: <file data>
```

## Constraints

- Max file size: 50MB (configurable per instance)
- MIME type: auto-detected
- `X-Atlassian-Token: nocheck` header auto-added by fetch tool for multipart
