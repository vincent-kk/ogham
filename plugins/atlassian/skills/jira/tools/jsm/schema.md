# jsm

Service Desk API paths are sent verbatim. Comments: [`tools/comment/schema.md`](../comment/schema.md#jsm-comments).

| Operation    | Method | Endpoint                                                      | Notes                                                                                                                            |
| ------------ | ------ | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| List desks   | GET    | `/rest/servicedeskapi/servicedesk`                            |                                                                                                                                  |
| List queues  | GET    | `/rest/servicedeskapi/servicedesk/{id}/queue`                 |                                                                                                                                  |
| Queue issues | GET    | `/rest/servicedeskapi/servicedesk/{id}/queue/{queueId}/issue` |                                                                                                                                  |
| Request      | GET    | `/rest/servicedeskapi/request/{issueIdOrKey}`                 | Request type, status, customer fields                                                                                            |
| SLA          | GET    | `/rest/servicedeskapi/request/{issueIdOrKey}/sla`             | `values[]`: `name`, `completedCycles[]`, `ongoingCycle.{remainingTime, breached}`; computed on the desk's working-hours calendar |

ProForma forms live on the separate Forms API (`api.atlassian.com`, cloudId-scoped), which this fetch tool cannot reach — report that as out of scope.
