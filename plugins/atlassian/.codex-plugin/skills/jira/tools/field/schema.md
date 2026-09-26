# field

| Operation             | Method | Endpoint                                                      | Notes                                                        |
| --------------------- | ------ | ------------------------------------------------------------- | ------------------------------------------------------------ |
| List fields           | GET    | `/field`                                                      | id, name, schema of every system and custom field            |
| Fields for issue type | GET    | `/issue/createmeta/{projectIdOrKey}/issuetypes/{issueTypeId}` | Allowed values per field — read before writing custom fields |
| List field options    | GET    | `/field/{fieldId}/context/{contextId}/option`                 | Cloud only                                                   |
| Add field options     | POST   | `/field/{fieldId}/context/{contextId}/option`                 | Cloud only. `{ options: [{ value }] }`                       |

Server/DC has no field options API — allowed values come from create/edit metadata only.
