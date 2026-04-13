---
name: atlassian-jira
description: "Jira API domain router. Routes Jira operations to the appropriate tool domain based on the requested action."
---

# atlassian-jira

Domain-based routing layer for all Jira REST API operations.

## When to Use

- Create, read, update, or delete Jira issues
- Search issues using JQL
- Manage sprints, boards, or epics (Agile)
- Handle workflow transitions
- Work with comments, worklogs, attachments, links, or watchers
- Query project, field, or user metadata
- Access JSM (Jira Service Management) queues, SLAs, or ProForma forms
- Retrieve development info (branches, commits, PRs linked to issues)
- Calculate issue time metrics

## Tool Catalog

| Domain | Description |
|---|---|
| `issue` | Issue CRUD, bulk create, changelog |
| `search` | JQL-based issue search (Cloud POST vs Server GET) |
| `transition` | Workflow state transitions |
| `comment` | Issue comments CRUD + JSM internal comments |
| `agile` | Board, Sprint, Epic operations via Agile REST API |
| `project` | Project metadata, components, versions |
| `field` | Field metadata and custom field option management |
| `link` | Internal issue links and remote issue links |
| `worklog` | Work time logging and retrieval |
| `attachment` | Attachment upload and metadata retrieval |
| `user` | User search and profile lookup |
| `watcher` | Issue watcher management |
| `jsm` | JSM SLA, queues, and ProForma form handling |
| `development-info` | Dev info: branches, commits, PRs linked to issues |
| `metrics` | Issue time metrics via changelog-based calculation |

## Lazy Reference Loading

Read `tools/<domain>/schema.md` ONLY when you need endpoint details for that domain.
Do not preload all schema files — load on demand per operation.

Example: for an issue create operation, read `tools/issue/schema.md`.
For JQL search, read `tools/search/schema.md` and optionally `tools/search/jql-guide.md`.

## Environment Detection

Before calling any endpoint, determine the environment:

- URL matches `*.atlassian.net` → **Cloud** (use v3 API where available)
- All other URLs → **Server/Data Center** (use v2 API)

The correct endpoint column is selected automatically once the environment is known.

## Error Handling

| HTTP Status | Action |
|---|---|
| 400 | Inspect error body — usually field validation failure; check schema.md for required fields |
| 401 | Trigger `atlassian-setup` skill for re-authentication |
| 403 | Permission denied — check project role or JSM agent access |
| 404 | Resource not found — verify issue key, project key, or resource ID |
| 429 | Rate limited — back off and retry with exponential delay |
| 500/503 | Atlassian service error — retry once, then report to user |

## Permission Boundaries

- **Read operations**: require Browse Project permission
- **Write operations**: require Edit Issue permission (or Create Issue for create)
- **Admin operations** (field config, project settings): require Project Admin or Jira Admin
- **JSM operations**: require Service Desk Agent role for queue/SLA access
- **Development info**: requires Connect app or Forge app with `read:jira-work` scope

## MCP Tools Available

All operations route through these MCP tools:

- `get` — Read operations (GET endpoints)
- `post` — Create operations (POST endpoints)
- `put` — Full update operations (PUT endpoints)
- `delete` — Delete operations (DELETE endpoints)

Use `fetchAtlassian` for raw API access when no dedicated MCP tool covers the operation.

## References

- `tools/issue/schema.md` — Issue endpoints, parameters, Cloud vs Server branching
- `tools/issue/field-formatting.md` — ADF vs Wiki markup, user/date/select field formatting
- `tools/issue/examples.md` — Issue create and update examples
- `tools/search/schema.md` — Search endpoints and parameters
- `tools/search/jql-guide.md` — JQL syntax reference
- `tools/transition/schema.md` — Transition endpoints and workflow state management
- `tools/comment/schema.md` — Comment endpoints and parameters
- `tools/comment/jsm-comment.md` — JSM internal comment handling
- `tools/agile/schema.md` — Agile board, sprint, epic endpoints
- `tools/project/schema.md` — Project metadata endpoints
- `tools/field/schema.md` — Field metadata endpoints
- `tools/field/custom-field-options.md` — Cloud-only custom field options API
- `tools/link/schema.md` — Issue link endpoints
- `tools/worklog/schema.md` — Worklog endpoints
- `tools/attachment/schema.md` — Attachment endpoints
- `tools/user/schema.md` — User search and profile endpoints
- `tools/watcher/schema.md` — Watcher management endpoints
- `tools/jsm/schema.md` — JSM SLA, queues, ProForma endpoints
- `tools/jsm/sla-calculation.md` — SLA working hours configuration
- `tools/jsm/forms.md` — ProForma form handling
- `tools/development-info/schema.md` — Dev info endpoints
- `tools/metrics/schema.md` — Time metrics calculation
