# agile

Same paths on Cloud and Server/DC; sent verbatim.

| Operation      | Method | Endpoint                                  | Notes                                                                           |
| -------------- | ------ | ----------------------------------------- | ------------------------------------------------------------------------------- |
| List boards    | GET    | `/rest/agile/1.0/board`                   | `projectKeyOrId`, `type` (`scrum`/`kanban`)                                     |
| Get board      | GET    | `/rest/agile/1.0/board/{boardId}`         |                                                                                 |
| Board issues   | GET    | `/rest/agile/1.0/board/{boardId}/issue`   | `jql` filter allowed                                                            |
| List sprints   | GET    | `/rest/agile/1.0/board/{boardId}/sprint`  | `state` (`active`/`future`/`closed`)                                            |
| Get sprint     | GET    | `/rest/agile/1.0/sprint/{sprintId}`       |                                                                                 |
| Sprint issues  | GET    | `/rest/agile/1.0/sprint/{sprintId}/issue` |                                                                                 |
| Create sprint  | POST   | `/rest/agile/1.0/sprint`                  | `{ name, originBoardId, startDate?, endDate? }`                                 |
| Update sprint  | PATCH  | `/rest/agile/1.0/sprint/{sprintId}`       | Partial; `state: "active"` starts, `"closed"` completes                         |
| Move to sprint | POST   | `/rest/agile/1.0/sprint/{sprintId}/issue` | `{ issues: ["KEY-1", …] }`                                                      |
| Get epic       | GET    | `/rest/agile/1.0/epic/{epicId}`           |                                                                                 |
| Epic issues    | GET    | `/rest/agile/1.0/epic/{epicId}/issue`     |                                                                                 |
| Move to epic   | POST   | `/rest/agile/1.0/epic/{epicId}/issue`     | `{ issues: [...] }`; on Cloud team-managed projects set `fields.parent` instead |
