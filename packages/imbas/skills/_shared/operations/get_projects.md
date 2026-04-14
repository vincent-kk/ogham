# [OP: get_projects]

List available Jira projects.

## REST Endpoint

```
GET /rest/api/3/project
```

## Response Fields (key subset)

- `[]` — Array of projects
  - `key` — Project key (e.g., `PROJ`)
  - `name` — Project name
  - `projectTypeKey` — Type (e.g., `software`, `business`)

## Used By

- `imbas-setup` — List available projects for selection
- `imbas-cache` — Fetch project metadata for cache
