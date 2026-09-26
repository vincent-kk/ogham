# development-info

Read-only. Requires the numeric issue `id` (from `GET /issue/{key}`), not the key.

| Operation | Method | Endpoint                                                                               | Notes                                                                                                    |
| --------- | ------ | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Summary   | GET    | `/rest/dev-status/1.0/issue/summary?issueId={id}`                                      | Counts of branches, commits, PRs                                                                         |
| Detail    | GET    | `/rest/dev-status/1.0/issue/detail?issueId={id}&applicationType={app}&dataType={type}` | `applicationType`: `GitHub`, `bitbucket`, `stash`, … · `dataType`: `repository`, `branch`, `pullrequest` |
