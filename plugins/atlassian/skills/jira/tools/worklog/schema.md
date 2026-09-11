# worklog

| Operation      | Method | Endpoint                    | Notes                                                                                   |
| -------------- | ------ | --------------------------- | --------------------------------------------------------------------------------------- |
| List worklogs  | GET    | `/issue/{key}/worklog`      |                                                                                         |
| Add worklog    | POST   | `/issue/{key}/worklog`      | `{ timeSpentSeconds, started, comment? }` — `started` as `YYYY-MM-DDTHH:mm:ss.sss+0000` |
| Update worklog | PUT    | `/issue/{key}/worklog/{id}` | Same fields                                                                             |
| Delete worklog | DELETE | `/issue/{key}/worklog/{id}` |                                                                                         |

`comment` is not markdown-converted (only `body`/`description` are). Server/DC: plain text. Cloud: an ADF object — build it with the `convert` tool (`markdown` → `adf`) or omit the comment.
