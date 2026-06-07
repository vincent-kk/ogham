# Environment Detection

## Rule

- URL matches `*.atlassian.net` → **Cloud**
- All other URLs → **Server / Data Center**

## API Version Mapping

| Product | Cloud | Server / DC |
|---|---|---|
| Jira | REST API v3 (`/rest/api/3/...`) | REST API v2 (`/rest/api/2/...`) |
| Confluence | V2 preferred (`/api/v2/...`), fallback to V1 (`/wiki/rest/api/...`) | V1 only (`/rest/api/...`) — `/wiki/` prefix is Cloud-only |
| Agile | `/rest/agile/1.0/...` (same on both) | `/rest/agile/1.0/...` (same on both) |
| JSM | Cloud-only endpoints | Limited availability |

## Cloud-Only Features

- Confluence inline comments (V2 API only)
- Confluence page analytics
- Jira issue archive endpoint
- Jira custom field options API
- JSM ProForma forms
