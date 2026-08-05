# [OP: add_comment]

Post a comment to an issue.

## REST Endpoint

```
POST /rest/api/3/issue/{issueIdOrKey}/comment
```

## Request Body

```json
{
  "body": { "type": "doc", "version": 1, "content": [...] }
}
```

- `body` uses ADF format on Cloud. Use a markdown→ADF converter if available.
- For plain text, wrap in a single paragraph node.

## Used By

- `split` — Post estimation/creation notes to issues
- `digest` — Post formatted digest comment
