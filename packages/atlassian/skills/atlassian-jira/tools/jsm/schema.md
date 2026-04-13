## Endpoints

| Operation | HTTP | Endpoint |
|---|---|---|
| List queues | GET | `/rest/servicedeskapi/servicedesk/{id}/queue` |
| Get SLA | GET | `/rest/servicedeskapi/request/{issueIdOrKey}/sla` |
| Get forms | GET | `/rest/servicedeskapi/request/{issueIdOrKey}/form` |
| Submit form | PUT | `/rest/servicedeskapi/request/{issueIdOrKey}/form/{formId}` |

## MCP Tool Mapping

| Operation | MCP Tool | Notes |
|---|---|---|
| List/Get | `get` | |
| Submit form | `put` | |
