---
name: atlassian-jira
user_invocable: false
description: "Domain router for Jira REST API operations — issue CRUD, JQL search, sprint/board/epic management, workflow transitions, comments, worklogs, attachments, links, watchers, JSM queues/SLA, dev info, and time metrics across 15 tool domains. Trigger: agent-dispatched only (via jira agent or direct skill invocation)."
version: "0.1.0"
complexity: complex
plugin: atlassian
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

## Permission Boundaries

- **Read operations**: require Browse Project permission
- **Write operations**: require Edit Issue permission (or Create Issue for create)
- **Admin operations** (field config, project settings): require Project Admin or Jira Admin
- **JSM operations**: require Service Desk Agent role for queue/SLA access
- **Development info**: requires Connect app or Forge app with `read:jira-work` scope

## References

- `../_shared/error-handling.md` — HTTP error handling protocol
- `../_shared/environment-detection.md` — Cloud vs Server/DC detection and API versioning
- `../_shared/mcp-tools.md` — Available MCP tools and usage
- `tools/<domain>/schema.md` — Domain-specific endpoint schemas (lazy load on demand)
- `tools/issue/field-formatting.md` — ADF vs Wiki markup, user/date/select field formatting
- `tools/issue/examples.md` — Issue create and update examples
- `tools/search/jql-guide.md` — JQL syntax reference
- `tools/comment/jsm-comment.md` — JSM internal comment handling
- `tools/field/custom-field-options.md` — Cloud-only custom field options API
- `tools/jsm/sla-calculation.md` — SLA working hours configuration
- `tools/jsm/forms.md` — ProForma form handling
