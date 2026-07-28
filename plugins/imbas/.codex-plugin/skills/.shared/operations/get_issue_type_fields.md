# [OP: get_issue_type_fields]

Fetch required and optional fields for a specific issue type.

## REST Endpoint

```
GET /rest/api/3/issue/createmeta/{projectKey}/issuetypes/{issueTypeId}
```

## Response Fields

- `fields` — Object of field definitions
  - `{fieldId}.required` — Whether the field is required for creation
  - `{fieldId}.name` — Field display name
  - `{fieldId}.schema.type` — Field data type

## Used By

- `setup` — Fetch required fields per issue type
- `cache` — Cache field metadata
