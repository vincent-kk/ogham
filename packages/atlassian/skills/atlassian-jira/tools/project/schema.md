## Endpoints

| Operation | HTTP | Cloud Endpoint | Server Endpoint |
|---|---|---|---|
| List projects | GET | `/rest/api/3/project` | `/rest/api/2/project` |
| Get project | GET | `/rest/api/3/project/{key}` | `/rest/api/2/project/{key}` |
| Issue types | GET | `/rest/api/3/issuetype/project?projectId={id}` | `/rest/api/2/project/{key}/statuses` |
| Components | GET | `/rest/api/3/project/{key}/components` | `/rest/api/2/project/{key}/components` |
| Versions | GET | `/rest/api/3/project/{key}/versions` | `/rest/api/2/project/{key}/versions` |

## MCP Tool Mapping

| Operation | MCP Tool | Method | Notes |
|---|---|---|---|
| All operations | `fetch` | GET | Read-only |
