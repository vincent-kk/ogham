# [OP: get_link_types]

Fetch all available issue link types.

## REST Endpoint

```
GET /rest/api/3/issueLinkType
```

## Response Fields

- `issueLinkTypes[]` — Array of link types
  - `id` — Link type ID
  - `name` — Link type name (e.g., `Blocks`)
  - `inward` — Inward description (e.g., `is blocked by`)
  - `outward` — Outward description (e.g., `blocks`)

## Used By

- `setup` — Fetch available link types
- `cache` — Cache link type metadata
