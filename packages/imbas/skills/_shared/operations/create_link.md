# [OP: create_link]

Create a typed link between two issues (Blocks, is split into, relates to).

## REST Endpoint

```
POST /rest/api/3/issueLink
```

## Request Body

```json
{
  "type": { "name": "Blocks" },
  "inwardIssue": { "key": "PROJ-101" },
  "outwardIssue": { "key": "PROJ-102" }
}
```

## Link Direction

- `inwardIssue` — The issue that **is affected** (e.g., "is blocked by")
- `outwardIssue` — The issue that **causes** (e.g., "blocks")

## Used By

- `imbas-manifest` — Create relationships between issues after batch creation
