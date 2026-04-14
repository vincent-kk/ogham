# [OP: search_jql]

Search for issues using JQL (Jira Query Language).

## REST Endpoint

```
POST /rest/api/3/search/jql          # Cloud
GET  /rest/api/2/search?jql=...      # Server/DC
```

## Parameters

| Name | Required | Description |
|------|----------|-------------|
| `jql` | yes | JQL query string (e.g., `project = PROJ AND type = Story`) |
| `fields` | no | Comma-separated field list |
| `maxResults` | no | Page size (default: 50, max: 100) |
| `startAt` | no | Pagination offset |

## Response Fields (key subset)

- `issues[]` — Array of matching issues
- `total` — Total result count
- `maxResults` — Page size used
- `startAt` — Current offset

## Used By

- `imbas-split` — Search for existing related Stories/Epics
- `imbas-devplan` — Optional search for related existing issues
