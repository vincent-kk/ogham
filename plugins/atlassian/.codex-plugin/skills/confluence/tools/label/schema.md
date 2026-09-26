# label

`service: "confluence"` on every call. Writes are V1-only, so they use full paths (`/wiki/rest/api/…` on Cloud, `/rest/api/…` on Server/DC).

| Operation    | Method | Endpoint                                                                      | Notes                                              |
| ------------ | ------ | ----------------------------------------------------------------------------- | -------------------------------------------------- |
| List labels  | GET    | `/pages/{id}/labels`                                                          | Logical path                                       |
| Add labels   | POST   | Cloud `/wiki/rest/api/content/{id}/label` · DC `/rest/api/content/{id}/label` | Body `[{ "prefix": "global", "name": "<label>" }]` |
| Remove label | DELETE | Cloud `/wiki/rest/api/content/{id}/label` · DC `/rest/api/content/{id}/label` | `query_params: { name: "<label>" }`                |

Do not send the array body through the logical `/pages/{id}/labels` path on DC — the body rewriter would turn the array into an object.
