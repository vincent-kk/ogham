# [OP: get_issue_types]

Fetch issue types available for a project.

## REST Endpoint

```
GET /rest/api/3/issuetype/project?projectId={projectId}
```

## Response Fields

- `[]` — Array of issue types
  - `id` — Issue type ID
  - `name` — Display name (e.g., `Story`, `Task`, `Bug`)
  - `subtask` — Whether this is a subtask type

## Used By

- `imbas-setup` — Fetch issue types for selected project
- `imbas-cache` — Cache issue type metadata
