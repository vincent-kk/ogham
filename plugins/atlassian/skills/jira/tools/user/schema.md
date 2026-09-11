# user

| Operation    | Method | Endpoint       | Cloud                         | Server/DC                                 |
| ------------ | ------ | -------------- | ----------------------------- | ----------------------------------------- |
| Current user | GET    | `/myself`      |                               |                                           |
| Search users | GET    | `/user/search` | `query_params: { query }`     | `query_params: { username }`              |
| Get user     | GET    | `/user`        | `query_params: { accountId }` | `query_params: { key }` or `{ username }` |

Assignable users for an issue or project: `GET /user/assignable/search` with `issueKey` or `project`.
