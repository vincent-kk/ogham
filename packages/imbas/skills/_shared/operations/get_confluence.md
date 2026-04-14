# [OP: get_confluence]

Fetch a Confluence page by ID, including its body content.

## REST Endpoint

```
GET /wiki/api/v2/pages/{pageId}?body-format=storage
```

## Parameters

| Name | Required | Description |
|------|----------|-------------|
| `pageId` | yes | Confluence page ID (numeric) |
| `body-format` | no | `storage` (HTML-like) or `atlas_doc_format` (ADF). Default: `storage` |

## Response Fields

- `id` — Page ID
- `title` — Page title
- `body.storage.value` — Page body in storage format
- `version.number` — Current version number

## Used By

- `imbas-validate` — Fetch Confluence page content when source is a URL
