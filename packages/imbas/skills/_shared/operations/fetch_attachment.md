# [OP: fetch_attachment]

Download an attachment from a Jira issue or Confluence page.

## REST Endpoint

```
GET /rest/api/3/attachment/content/{attachmentId}
```

## Parameters

| Name | Required | Description |
|------|----------|-------------|
| `attachmentId` | yes | Attachment ID (from issue or page metadata) |

## Notes

- Response is binary content. Use `save_to_path` if available on the HTTP tool.
- For Confluence attachments, the URL pattern may differ:
  `GET /wiki/rest/api/content/{pageId}/child/attachment`

## Used By

- `imbas:fetch-media` — Download attached media from issues/pages
