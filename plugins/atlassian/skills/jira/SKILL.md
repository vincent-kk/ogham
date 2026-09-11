---
name: jira
user-invocable: true
description: "Jira REST API router — issue CRUD, JQL search, sprints/boards/epics, transitions, comments, worklogs, links, watchers, JSM queues/SLA, dev info on Cloud and Server/DC. Use for any Jira request, issue key (PROJ-123), or Jira URL; attachment downloads go to the download skill."
version: "0.2.1"
complexity: complex
plugin: atlassian
---

# jira

Resolves a Jira request to an endpoint and an `mcp__plugin_atlassian_tools__fetch` call. Parameters: [`mcp-tools.md`](../.shared/mcp-tools.md). Errors: [`error-handling.md`](../.shared/error-handling.md).

## Execution model

Execute directly for single-call work (one issue, one search, one comment, one transition, one worklog). Spawn the `jira` agent for bulk writes (>3 issues), chains across domains (create + comment + transition + link), work that needs field metadata first, or retries with corrected parameters.

## Call contract

1. Read `tools/<domain>/schema.md` for the domain in play — nothing else up front.
2. Deployment is decided by hostname: `*.atlassian.net` → Cloud, anything else → Server/DC; the stored site config carries the result. Send logical paths (`/issue/{key}`, `/myself`, `/field`); the MCP layer attaches `/rest/api/3` (Cloud) or `/rest/api/2` (Server/DC). Prefixes `/rest/`, `/wiki/`, `/secure/`, `/download/`, `/plugins/` pass through verbatim. Agile, JSM, dev-status and Jira search paths are pass-through by design, including `/rest/agile/1.0/…`, `/rest/servicedeskapi/…`, `/rest/dev-status/1.0/…`. Never hardcode `/rest/api/{2|3}` for logical endpoints: it passes through unchanged and 404s on the other deployment. An absolute URL of a configured site has its base stripped before these rules apply. A DC context path (e.g. `https://host/jira`) lives in `base_url` only; never repeat it in the endpoint.
3. Send `description`/`body` text as Markdown with `content_format: "markdown"`; conversion scope, native formats, and escaping rules: `tools/issue/schema.md`.
4. After a write whose body carries heavy formatting or wiki specials, `GET /issue/{key}` with `expand: ["renderedFields"]`; a `class="error"` span in the rendered HTML means broken markup — fix the body and update again.
5. Comments on Server/DC: list with `mcp__plugin_atlassian_tools__comment_thread` (applies the site's reply-plugin profile; without one it returns the standard comments plus a `hint` — then run "Thread clues" in `tools/comment/schema.md` once). Cloud: `fetch`.
6. Recovery follows [`error-handling.md`](../.shared/error-handling.md#errors).

Cloud-only: issue archive, custom field options API, JSM ProForma forms.

## Domains

| Domain             | Covers                                                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `issue`            | Issue CRUD, bulk create, create/edit metadata, changelog, archive                                                 |
| `search`           | JQL search — Cloud `POST /rest/api/3/search/jql`, DC `GET /rest/api/2/search`                                     |
| `transition`       | Workflow transitions (never set `status` directly)                                                                |
| `comment`          | Comments CRUD, JSM internal/public comments (see `tools/comment/schema.md#jsm-comments`), DC reply-plugin threads |
| `agile`            | Boards, sprints, epics (`/rest/agile/1.0`)                                                                        |
| `project`          | Projects, issue types, components, versions                                                                       |
| `field`            | Field metadata, Cloud custom field options                                                                        |
| `link`             | Issue links, remote links                                                                                         |
| `worklog`          | Worklog list/add                                                                                                  |
| `attachment`       | Attachment metadata; download via `download` skill; upload unsupported                                            |
| `user`             | Current user, user search/lookup                                                                                  |
| `watcher`          | Watcher list/add/remove                                                                                           |
| `jsm`              | Service desk queues, requests, SLA                                                                                |
| `development-info` | Branches, commits, PRs linked to an issue                                                                         |
| `metrics`          | Cycle/lead time from the changelog                                                                                |

## Jira URLs

`/browse/{KEY}` or `/jira/browse/{KEY}` → issue key. Query `focusedCommentId={id}` or `focusedId={id}` → fetch only `GET /issue/{KEY}/comment/{id}` instead of the whole issue.

## Identity and deployment

Cloud identifies users by `accountId`; Server/DC by `name`/`key`. Dev-status needs the numeric issue ID and a Connect/Forge integration. ProForma forms are on a separate API this plugin cannot reach.
