# [OP: create_issue]

Create a new Jira issue (Epic, Story, Task, Sub-task, or Bug).

## REST Endpoint

```
POST /rest/api/3/issue
```

## Request Body

```json
{
  "fields": {
    "project": { "key": "PROJ" },
    "issuetype": { "name": "Story" },
    "summary": "Issue title",
    "description": { "type": "doc", "version": 1, "content": [...] },
    "parent": { "key": "PROJ-100" }
  }
}
```

- `description` uses ADF format on Cloud. Use a markdown→ADF converter if available.
- `parent` is required for Sub-task type and optional for Stories under Epics.

## Response Fields

- `id` — Numeric issue ID
- `key` — Issue key (e.g., `PROJ-123`)
- `self` — API URL of created issue

## Used By

- `split` — Batch creation of Epics, Stories, Tasks
