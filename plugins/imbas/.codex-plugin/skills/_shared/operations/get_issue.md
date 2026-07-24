# [OP: get_issue]

Fetch a single issue by key, including metadata, description, status, assignee, and comments.

## Provider Resolution

The sections below document the Jira semantics. When a skill invokes this
operation without a provider-specific workflow file (e.g., `split`), resolve
by `config.provider`:

- `jira` — Jira MCP tool or REST endpoint below
- `github` — `gh issue view <number> --repo <owner/repo> --json number,title,body,state,labels,assignees,comments`
- `local` — read `.imbas/<KEY>/issues/<type-dir>/<ID>.md` (path derived from the ID prefix: S→stories, T→tasks, ST→subtasks); parse frontmatter + `## Description` / `## Digest`

## REST Endpoint

```
GET /rest/api/3/issue/{issueIdOrKey}
```

**Common expand**: `?expand=renderedFields` (for HTML-rendered field values)

## Parameters

| Name           | Required | Description                                                     |
| -------------- | -------- | --------------------------------------------------------------- |
| `issueIdOrKey` | yes      | Issue key (e.g., `PROJ-123`) or numeric ID                      |
| `fields`       | no       | Comma-separated field list to limit response size               |
| `expand`       | no       | `renderedFields`, `names`, `schema`, `transitions`, `changelog` |

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

- `read-issue` — Primary: load issue + comment thread
- `scaffold-pr` — Fetch issue details including subtasks
- `manifest` — Drift check to verify remote state
- `split` — Verify Epic existence when `--epic` provided
- `devplan` — Optional enrichment during code exploration
- `digest` — Transitively via `imbas:read-issue`
