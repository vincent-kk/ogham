# user

V1 endpoints on both deployments — full paths with `service: "confluence"`.

| Operation    | Method | Cloud                         | Server/DC                | Notes                                                       |
| ------------ | ------ | ----------------------------- | ------------------------ | ----------------------------------------------------------- |
| Current user | GET    | `/wiki/rest/api/user/current` | `/rest/api/user/current` |                                                             |
| Get user     | GET    | `/wiki/rest/api/user`         | `/rest/api/user`         | `query_params: { accountId }` · `{ username }` or `{ key }` |
| Search users | GET    | `/wiki/rest/api/search/user`  | `/rest/api/search/user`  | `query_params: { cql: 'user.fullname ~ "name"' }`           |
