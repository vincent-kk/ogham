## Endpoints

| Operation | HTTP | Endpoint |
|---|---|---|
| List queues | GET | `/rest/servicedeskapi/servicedesk/{id}/queue` |
| Get SLA | GET | `/rest/servicedeskapi/request/{issueIdOrKey}/sla` |
| Get forms | GET | `/rest/servicedeskapi/request/{issueIdOrKey}/form` |
| Submit form | PUT | `/rest/servicedeskapi/request/{issueIdOrKey}/form/{formId}` |

## MCP Tool Mapping

| Operation | MCP Tool | Method | Notes |
|---|---|---|---|
| List/Get | `fetch` | GET | |
| Submit form | `fetch` | PUT | |
