# search

CQL search is a V1 endpoint on both deployments; send the full path with `service: "confluence"`.

| Deployment | Method | Endpoint                        | Request                                                               |
| ---------- | ------ | ------------------------------- | --------------------------------------------------------------------- |
| Cloud      | GET    | `/wiki/rest/api/content/search` | `query_params: { cql, limit?, start?, expand? }` — all values strings |
| Server/DC  | GET    | `/rest/api/content/search`      | same                                                                  |

Default `limit` 25. `expand: "body.storage,version,space"` when content is needed. Response `results[]` with `_links.next` for paging.

CQL notes: `space = "KEY"`, `type = page`, `title ~ "text"`, `text ~ "text"`, `label = "x"`, `ancestor = <pageId>` (any depth), `lastmodified >= now("-7d")`, `creator = currentUser()`.
