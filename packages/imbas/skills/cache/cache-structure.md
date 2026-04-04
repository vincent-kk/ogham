# Cache Structure

## Cache Structure

```
.imbas/<PROJECT-KEY>/cache/
├── project-meta.json     # Project name, key, URL, lead, type
├── issue-types.json      # Issue types with required fields per type
├── link-types.json       # Issue link types (inward/outward names)
├── workflows.json        # Workflow states and transitions
└── cached_at.json        # Cache timestamp and TTL
```

### project-meta.json

```json
{
  "key": "PROJ",
  "name": "My Project",
  "url": "https://myorg.atlassian.net/browse/PROJ",
  "lead": "user@example.com",
  "project_type": "software"
}
```

### issue-types.json

```json
{
  "types": [
    {
      "id": "10001",
      "name": "Epic",
      "subtask": false,
      "fields": {
        "summary": { "required": true },
        "description": { "required": false },
        "customfield_10011": { "name": "Epic Name", "required": true }
      }
    },
    {
      "id": "10002",
      "name": "Story",
      "subtask": false,
      "fields": { "summary": { "required": true } }
    }
  ]
}
```

### link-types.json

```json
{
  "types": [
    { "id": "10000", "name": "Blocks", "inward": "is blocked by", "outward": "blocks" },
    { "id": "10001", "name": "Cloners", "inward": "is cloned by", "outward": "clones" }
  ]
}
```

### cached_at.json

```json
{
  "cached_at": "2026-04-04T10:00:00+09:00",
  "ttl_hours": 24
}
```
