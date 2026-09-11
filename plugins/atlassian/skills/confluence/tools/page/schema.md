# page

Logical paths; `service: "confluence"` on every call.

| Operation       | Method | Endpoint                                 | Notes                                                                                                           |
| --------------- | ------ | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Get page        | GET    | `/pages/{id}`                            | Cloud: `query_params: { "body-format": "storage" }`; DC: `expand: ["body.storage", "version", "ancestors"]`     |
| Create page     | POST   | `/pages`                                 | Body below; `content_format: "markdown"`                                                                        |
| Update page     | PUT    | `/pages/{id}`                            | Body below; `content_format: "markdown"`; `version.number` = current + 1                                        |
| Delete page     | DELETE | `/pages/{id}`                            | Confirm first when the page has children                                                                        |
| Children        | GET    | `/pages/{id}/children`                   |                                                                                                                 |
| Descendants     | GET    | `/pages/{id}/descendants`                | Cloud: cursor-paginated, `depth` param; DC: `/content/{id}/descendant/page`                                     |
| Ancestors       | GET    | `/pages/{id}`                            | Cloud: walk `parentId` upward; DC: `expand: ["ancestors"]`                                                      |
| Move            | PUT    | `/pages/{id}/move/{position}/{targetId}` | DC only (`before` · `after` · `append`). Cloud: update the page with a new `parentId`                           |
| Versions        | GET    | `/pages/{id}/versions`                   |                                                                                                                 |
| Restore version | POST   | `/pages/{id}/versions`                   | DC only: `{ operationKey: "restore", params: { versionNumber } }`. Cloud: re-send the old body as a new version |

## Bodies

Create (both deployments): `{ spaceId, title, body: "<markdown>", parentId?, status?: "current" }` — `spaceId` is the numeric space id on Cloud and the space key on DC. On DC the MCP layer maps `spaceId → space.key`, `parentId → ancestors`, injects `type: "page"`, drops `status`.

Update: the MCP layer does not fill in required fields on PUT, so send the deployment's full shape:

- Cloud: `{ id, status: "current", title, body: "<markdown>", version: { number } }`
- DC: `{ type: "page", title, body: "<markdown>", version: { number } }`

`version.number` is read from the page immediately before the update; on 409 re-read and retry (max 3).
