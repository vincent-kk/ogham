# link

| Operation          | Method | Endpoint                  | Notes                                                                       |
| ------------------ | ------ | ------------------------- | --------------------------------------------------------------------------- |
| Link types         | GET    | `/issueLinkType`          | Names for `type.name` (e.g. `Blocks`, `Relates`)                            |
| Create link        | POST   | `/issueLink`              | `{ type: { name }, inwardIssue: { key }, outwardIssue: { key }, comment? }` |
| Delete link        | DELETE | `/issueLink/{linkId}`     | `linkId` from `fields.issuelinks[].id`                                      |
| Remote links       | GET    | `/issue/{key}/remotelink` |                                                                             |
| Create remote link | POST   | `/issue/{key}/remotelink` | `{ object: { url, title }, globalId? }`                                     |
