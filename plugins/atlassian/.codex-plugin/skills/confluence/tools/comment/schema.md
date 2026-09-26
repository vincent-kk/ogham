# comment

`service: "confluence"` on every call.

| Operation            | Method | Endpoint                      | Notes                                                                                                                    |
| -------------------- | ------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| List footer comments | GET    | `/pages/{id}/footer-comments` | Cloud: `query_params: { "body-format": "storage" }`; DC: `expand: ["body.storage"]`                                      |
| Add footer comment   | POST   | `/footer-comments`            | `{ pageId, body: "<markdown>" }` with `content_format: "markdown"`. DC: `pageId → container`, `type: "comment"` injected |
| Reply to comment     | POST   | `/footer-comments`            | Cloud: add `parentCommentId`; DC: `{ container: { id: pageId, type: "page" }, ancestors: [{ id: parentId }], body }`     |
| List inline comments | GET    | `/pages/{id}/inline-comments` | Cloud only. On DC this path is not rewritten and 404s                                                                    |
