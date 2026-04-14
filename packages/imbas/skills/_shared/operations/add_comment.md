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

- `imbas-manifest` — Post B→A feedback comments to Story issues
- `imbas-digest` — Post formatted digest comment
