# space

Logical paths; `service: "confluence"`.

| Operation   | Method | Endpoint       | Notes                                                                                                         |
| ----------- | ------ | -------------- | ------------------------------------------------------------------------------------------------------------- |
| List spaces | GET    | `/spaces`      | `query_params: { type?: "global" \| "personal", limit? }`; Cloud pages by `_links.next` cursor, DC by `start` |
| Get space   | GET    | `/spaces/{id}` | `{id}` is the numeric id on Cloud and the space key on Server/DC — no translation between the two             |

To find a Cloud space id from its key: `GET /spaces` with `query_params: { keys: "KEY" }`.
