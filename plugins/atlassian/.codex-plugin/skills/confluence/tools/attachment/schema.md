# attachment

`service: "confluence"` on every call.

| Operation | Method | Endpoint                      | Notes                                                                                         |
| --------- | ------ | ----------------------------- | --------------------------------------------------------------------------------------------- |
| List      | GET    | `/pages/{id}/attachments`     | Cloud: `downloadLink` per item; DC: `_links.download`                                         |
| Download  | GET    | the download link             | Relative `/download/attachments/…` works as-is on both deployments — use the `download` skill |
| Delete    | DELETE | `/attachments/{attachmentId}` | DC: rewritten to `/content/{attachmentId}`                                                    |

Upload is not supported: the fetch tool cannot send multipart bodies. Tell the user to attach the file in the Confluence UI.
