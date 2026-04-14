# [OP: edit_issue]

Update fields on an existing issue.

## REST Endpoint

```
PUT /rest/api/3/issue/{issueIdOrKey}
```

## Request Body

```json
{
  "fields": {
    "summary": "Updated title",
    "description": { "type": "doc", "version": 1, "content": [...] }
  }
}
```

Only include fields that need to change. Unmentioned fields are preserved.

## Used By

- `imbas-manifest` — Update issue fields after creation (e.g., horizontal split)
