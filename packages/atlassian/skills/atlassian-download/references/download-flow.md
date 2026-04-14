# Download Flow Reference

## Namespace Path Convention

Derive save path from the source context to enable filesystem-based caching:

| Source | Namespace | Example save_to_path |
|--------|-----------|---------------------|
| Jira issue | `{issueKey}` | `.temp/KAN-27/screenshot.png` |
| Jira issue + comment | `{issueKey}_comment-{commentId}` | `.temp/KAN-27_comment-10110/demo.mp4` |
| Confluence page | `confluence-{pageId}` | `.temp/confluence-12345/diagram.png` |

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

### By Page ID

1. List attachments: `GET /rest/api/content/{pageId}/child/attachment`
2. Find target attachment in results
3. Download via download link with `accept_format: "raw"`

### V2 API (Cloud)

1. List: `GET /api/v2/pages/{pageId}/attachments`
2. Download link in `downloadLink` field

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
  content_type: "multipart/form-data"
  body: <file data>
```

## Constraints

- Max file size: 50MB (configurable per instance)
- MIME type: auto-detected
- `X-Atlassian-Token: nocheck` header auto-added by fetch tool for multipart
