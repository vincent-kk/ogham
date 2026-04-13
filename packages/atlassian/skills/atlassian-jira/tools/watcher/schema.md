## Endpoints

| Operation | HTTP | Cloud Endpoint | Server Endpoint |
|---|---|---|---|
| Get watchers | GET | `/rest/api/3/issue/{key}/watchers` | `/rest/api/2/issue/{key}/watchers` |
| Add watcher | POST | `/rest/api/3/issue/{key}/watchers` | `/rest/api/2/issue/{key}/watchers` |
| Remove watcher | DELETE | `/rest/api/3/issue/{key}/watchers?accountId={id}` | `/rest/api/2/issue/{key}/watchers?username={name}` |

## MCP Tool Mapping

| Operation | MCP Tool | Notes |
|---|---|---|
| Get | `get` | |
| Add | `post` | Body: accountId string (Cloud) or username (Server) |
| Remove | `delete` | Via query parameter |
