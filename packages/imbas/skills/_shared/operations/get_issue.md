# [OP: get_issue]

Fetch a single issue by key, including metadata, description, status, assignee, and comments.

## REST Endpoint

```
GET /rest/api/3/issue/{issueIdOrKey}
```

**Common expand**: `?expand=renderedFields` (for HTML-rendered field values)

## Parameters

| Name | Required | Description |
|------|----------|-------------|
| `issueIdOrKey` | yes | Issue key (e.g., `PROJ-123`) or numeric ID |
| `fields` | no | Comma-separated field list to limit response size |
| `expand` | no | `renderedFields`, `names`, `schema`, `transitions`, `changelog` |

## Response Fields (key subset)

- `key` — Issue key (e.g., `PROJ-123`)
- `fields.summary` — Title
- `fields.description` — Body (ADF format on Cloud, wiki markup on Server)
- `fields.status.name` — Current workflow state
- `fields.issuetype.name` — Issue type
- `fields.assignee.displayName` — Assignee
- `fields.reporter.displayName` — Reporter
- `fields.subtasks[]` — Child subtask references
- `fields.comment.comments[]` — Comment thread

## Used By

- `imbas-read-issue` — Primary: load issue + comment thread
- `imbas-scaffold-pr` — Fetch issue details including subtasks
- `imbas-manifest` — Drift check to verify remote state
- `imbas-split` — Verify Epic existence when `--epic` provided
- `imbas-devplan` — Optional enrichment during code exploration
- `imbas-digest` — Transitively via `imbas:imbas-read-issue`
