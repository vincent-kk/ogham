# issue — Schema Reference

Issue CRUD, bulk create, and changelog operations.

## Endpoints

| Operation | HTTP | Cloud Endpoint | Server Endpoint |
|---|---|---|---|
| Get issue | GET | `/rest/api/3/issue/{issueIdOrKey}` | `/rest/api/2/issue/{issueIdOrKey}` |
| Create issue | POST | `/rest/api/3/issue` | `/rest/api/2/issue` |
| Update issue | PUT | `/rest/api/3/issue/{issueIdOrKey}` | `/rest/api/2/issue/{issueIdOrKey}` |
| Delete issue | DELETE | `/rest/api/3/issue/{issueIdOrKey}` | `/rest/api/2/issue/{issueIdOrKey}` |
| Bulk create | POST | `/rest/api/3/issue/bulk` | `/rest/api/2/issue/bulk` |
| Get changelog | GET | `/rest/api/3/issue/{issueIdOrKey}/changelog` | `/rest/api/2/issue/{issueIdOrKey}/changelog` |
| Get create metadata | GET | `/rest/api/3/issue/createmeta` | `/rest/api/2/issue/createmeta` |
| Get edit metadata | GET | `/rest/api/3/issue/{issueIdOrKey}/editmeta` | `/rest/api/2/issue/{issueIdOrKey}/editmeta` |
| Assign issue | PUT | `/rest/api/3/issue/{issueIdOrKey}/assignee` | `/rest/api/2/issue/{issueIdOrKey}/assignee` |
| Archive issue | PUT | `/rest/api/3/issue/{issueIdOrKey}/archive` | — |

## Parameters

### Get Issue

| Parameter | Type | Required | Description |
|---|---|---|---|
| `issueIdOrKey` | string | yes | Issue ID (e.g., `10001`) or key (e.g., `PROJ-123`) |
| `fields` | string[] | no | Comma-separated list of fields to return; `*all` for all fields |
| `fieldsByKeys` | boolean | no | Use field keys instead of IDs when `true` |
| `expand` | string | no | `renderedFields`, `names`, `schema`, `transitions`, `changelog`, `editmeta` |
| `properties` | string[] | no | Entity property keys to include |
| `updateHistory` | boolean | no | Add to user's recent issues when `true` |

### Create / Update Issue

| Parameter | Type | Required | Description |
|---|---|---|---|
| `fields` | object | yes | Map of field IDs to values |
| `fields.summary` | string | yes (create) | Issue summary / title |
| `fields.issuetype` | object | yes (create) | `{ id: "10001" }` or `{ name: "Bug" }` |
| `fields.project` | object | yes (create) | `{ id: "10000" }` or `{ key: "PROJ" }` |
| `fields.description` | ADF/string | no | Cloud: ADF object; Server: Wiki markup string |
| `fields.assignee` | object | no | Cloud: `{ accountId: "..." }`; Server: `{ name: "..." }` |
| `fields.priority` | object | no | `{ name: "High" }` or `{ id: "2" }` |
| `fields.labels` | string[] | no | Array of label strings |
| `fields.components` | object[] | no | `[{ id: "10000" }]` or `[{ name: "UI" }]` |
| `fields.fixVersions` | object[] | no | `[{ id: "10001" }]` or `[{ name: "v1.0" }]` |
| `fields.duedate` | string | no | ISO 8601 date: `"2024-12-31"` |
| `fields.parent` | object | no | `{ key: "PROJ-100" }` for sub-tasks |
| `update` | object | no | Field update instructions for atomic operations (e.g., add/remove labels) |
| `notifyUsers` | boolean | no | Send email notifications when `true` (default: `true`) |

### Bulk Create

| Parameter | Type | Required | Description |
|---|---|---|---|
| `issueUpdates` | object[] | yes | Array of issue objects, each with `fields` |

### Get Changelog

| Parameter | Type | Required | Description |
|---|---|---|---|
| `issueIdOrKey` | string | yes | Issue ID or key |
| `startAt` | integer | no | Pagination offset (default: 0) |
| `maxResults` | integer | no | Max items per page (default: 100, max: 100) |

## Cloud vs Server Branching

| Feature | Cloud (v3) | Server/DC (v2) |
|---|---|---|
| Description format | ADF (Atlassian Document Format) JSON object | Wiki markup string |
| Assignee field | `{ accountId: "5b10..." }` | `{ name: "username" }` |
| Reporter field | `{ accountId: "5b10..." }` | `{ name: "username" }` |
| Archive endpoint | `/rest/api/3/issue/{key}/archive` | Not available |
| Bulk create max | 50 issues per request | 50 issues per request |
| `createmeta` response | Paginated with `fields` sub-resource | Flat response |

## MCP Tool Mapping

| Operation | MCP Tool | Notes |
|---|---|---|
| Get issue | `get` | |
| Create issue | `post` | |
| Update issue | `put` | |
| Delete issue | `delete` | |
| Bulk create | `post` | POST to `/issue/bulk` |
| Get changelog | `get` | GET to `/issue/{key}/changelog` |
| Get create metadata | `get` | GET to `/issue/createmeta` |
| Assign issue | `put` | PUT to `/issue/{key}/assignee` |
