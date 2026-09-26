# search

Path and method differ per deployment and are not translated — send the full path.

| Deployment | Method | Endpoint                 | Request                                                                                                                |
| ---------- | ------ | ------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Cloud      | POST   | `/rest/api/3/search/jql` | Body `{ jql, fields?, maxResults?, nextPageToken? }` — cursor pagination                                               |
| Server/DC  | GET    | `/rest/api/2/search`     | `query_params: { jql, fields?, maxResults?, startAt? }` — all values strings, `fields` comma-joined; offset pagination |

Default page size 50. Request only the `fields` you need; issues with ADF descriptions gain a `description_markdown` twin in the response.
