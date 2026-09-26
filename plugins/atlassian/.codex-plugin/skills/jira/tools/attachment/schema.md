# attachment

| Operation | Method | Endpoint                 | Notes                                                                                           |
| --------- | ------ | ------------------------ | ----------------------------------------------------------------------------------------------- |
| Metadata  | GET    | `/issue/{key}`           | `query_params: { fields: "attachment" }` → `fields.attachment[]` with `filename`, `content` URL |
| Download  | GET    | `attachment.content` URL | Use the `download` skill (`accept_format: "raw"`, `save_to_path`)                               |
| Delete    | DELETE | `/attachment/{id}`       |                                                                                                 |

Upload is not supported: the fetch tool cannot send multipart bodies. Tell the user to attach the file in the Jira UI.
