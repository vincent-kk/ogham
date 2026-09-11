# project

| Operation      | Method | Endpoint                               | Notes                                                                                                                      |
| -------------- | ------ | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| List projects  | GET    | `/project`                             | Cloud also has paginated `/project/search`                                                                                 |
| Get project    | GET    | `/project/{projectIdOrKey}`            | `expand: ["issueTypes", "lead"]`                                                                                           |
| Issue types    | GET    | `/project/{projectIdOrKey}/statuses`   | Issue types with their workflow statuses; on Cloud, `GET /issuetype/project` with `query_params: { projectId }` also works |
| Components     | GET    | `/project/{projectIdOrKey}/components` |                                                                                                                            |
| Versions       | GET    | `/project/{projectIdOrKey}/versions`   |                                                                                                                            |
| Create version | POST   | `/version`                             | `{ name, projectId, released?, releaseDate? }`                                                                             |
