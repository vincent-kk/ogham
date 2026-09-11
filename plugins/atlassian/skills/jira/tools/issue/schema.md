# issue

| Operation                    | Method | Endpoint                                                      | Notes                                                                                                                                                 |
| ---------------------------- | ------ | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Get issue                    | GET    | `/issue/{issueIdOrKey}`                                       | `query_params.fields` (comma list, `*all`), `expand: ["renderedFields", "changelog", "editmeta", "transitions", "names", "schema"]`                   |
| Create issue                 | POST   | `/issue`                                                      | `content_format: "markdown"` for `fields.description`                                                                                                 |
| Update issue                 | PUT    | `/issue/{issueIdOrKey}`                                       | `fields` and/or `update`; to silence mail append `?notifyUsers=false` to the path (`query_params` is dropped on PUT)                                  |
| Delete issue                 | DELETE | `/issue/{issueIdOrKey}`                                       | `query_params: { deleteSubtasks: "true" }` when it has sub-tasks                                                                                      |
| Assign                       | PUT    | `/issue/{issueIdOrKey}/assignee`                              | Body: user object (below)                                                                                                                             |
| Bulk create                  | POST   | `/issue/bulk`                                                 | `{ issueUpdates: [{ fields }, …] }`, max 50. Nested descriptions are not markdown-converted: pre-convert with the `convert` tool or create one by one |
| Changelog                    | GET    | `/issue/{issueIdOrKey}/changelog`                             | `startAt`, `maxResults` (≤100)                                                                                                                        |
| Create metadata: issue types | GET    | `/issue/createmeta/{projectIdOrKey}/issuetypes`               | Paginated                                                                                                                                             |
| Create metadata: fields      | GET    | `/issue/createmeta/{projectIdOrKey}/issuetypes/{issueTypeId}` | DC < 8.4 has only flat `GET /issue/createmeta`                                                                                                        |
| Edit metadata                | GET    | `/issue/{issueIdOrKey}/editmeta`                              |                                                                                                                                                       |
| Archive                      | PUT    | `/issue/{issueIdOrKey}/archive`                               | Cloud only                                                                                                                                            |

## Create / update body

`{ fields: { … }, update?: { … } }`

| Field                       | Value                                                                           |
| --------------------------- | ------------------------------------------------------------------------------- |
| `project` (create)          | `{ key }` or `{ id }`                                                           |
| `issuetype` (create)        | `{ name }` or `{ id }`                                                          |
| `summary` (create)          | string                                                                          |
| `description`               | Markdown string with `content_format: "markdown"`                               |
| `assignee`, `reporter`      | Cloud `{ accountId }`; Server/DC `{ name }`                                     |
| `priority`                  | `{ name }` or `{ id }`                                                          |
| `labels`                    | `string[]`                                                                      |
| `components`, `fixVersions` | `[{ name }]` or `[{ id }]`                                                      |
| `duedate`                   | `YYYY-MM-DD`                                                                    |
| `parent`                    | `{ key }` (sub-tasks, or child of an epic on Cloud)                             |
| `customfield_NNNNN`         | Shape from create/edit metadata — see [Field value shapes](#field-value-shapes) |

Server/DC: the issue's `comment` field never carries reply-plugin replies — see `tools/comment/schema.md`.

## Field formatting

`content_format: "markdown"` converts `description`, `body`, and `fields.description`: ADF on Cloud, wiki markup on Server/DC. Other fields are sent as given.

### Wiki markup (Server/DC) escaping

The markdown→wiki converter escapes wiki specials (`[ ] { } | * _ - + ^ ~ !`) in plain text, inline code, and bold/italic/strike, so `[0]`, `{timeout}`, `a|b` render literally. Markdown escapes (`\[`) pass through.

Not protected — keep such content in fenced code blocks or rephrase:

- Link labels and image alt text (wiki cannot escape inside `[alias|url]` / `!url|alt=x!`)
- Doubled markers `{{` and `??`
- Backslash runs — `\\` is a forced line break in wiki markup (UNC paths)

## Field value shapes

| Kind          | Cloud                                                                                                  | Server/DC               |
| ------------- | ------------------------------------------------------------------------------------------------------ | ----------------------- |
| User          | `{ accountId }`                                                                                        | `{ name }` or `{ key }` |
| Date          | `YYYY-MM-DD`                                                                                           | same                    |
| Datetime      | `YYYY-MM-DDTHH:mm:ss.sssZ`                                                                             | same                    |
| Single select | `{ value }` or `{ id }`                                                                                | same                    |
| Multi select  | `[{ value }, …]`                                                                                       | same                    |
| Custom field  | `customfield_NNNNN` — read its schema from create/edit metadata (above) or `GET /field` before writing |                         |
