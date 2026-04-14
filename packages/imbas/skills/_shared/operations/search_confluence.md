# [OP: search_confluence]

Search Confluence content using CQL (Confluence Query Language).

## REST Endpoint

```
GET /wiki/rest/api/content/search?cql=...
```

## Parameters

| Name | Required | Description |
|------|----------|-------------|
| `cql` | yes | CQL query (e.g., `type = page AND space = DEV AND title ~ "spec"`) |
| `limit` | no | Max results (default: 25) |

## Response Fields

- `results[]` — Array of matching content
  - `id` — Content ID
  - `title` — Content title
  - `type` — Content type (`page`, `blogpost`)
  - `_links.webui` — Browser URL

## Used By

- `imbas-validate` — Resolve references to other Confluence pages
