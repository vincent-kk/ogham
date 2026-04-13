# Download Flow Reference

## Jira Attachment Download

### By Issue Key + Filename

1. Fetch issue: `GET /rest/api/{version}/issue/{key}?fields=attachment`
2. Find attachment by filename in `fields.attachment[]`
3. Download via `attachment.content` URL with `accept_format: "raw"`

### By Direct URL

1. Use the attachment content URL directly
2. `GET {url}` with `accept_format: "raw"`

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
Tool: post
Params:
  endpoint: /rest/api/{version}/issue/{key}/attachments
  content_type: "multipart/form-data"
  body: <file data>
```

### Confluence Attachment Upload

```
Tool: post
Params:
  endpoint: /rest/api/content/{pageId}/child/attachment
  content_type: "multipart/form-data"
  body: <file data>
```

## Constraints

- Max file size: 50MB (configurable per instance)
- MIME type: auto-detected
- `X-Atlassian-Token: nocheck` header auto-added by post tool for multipart
