## Endpoints

| Operation | HTTP | Cloud Endpoint | Server Endpoint |
|---|---|---|---|
| Get watchers | GET | `/rest/api/3/issue/{key}/watchers` | `/rest/api/2/issue/{key}/watchers` |
| Add watcher | POST | `/rest/api/3/issue/{key}/watchers` | `/rest/api/2/issue/{key}/watchers` |
| Remove watcher | DELETE | `/rest/api/3/issue/{key}/watchers?accountId={id}` | `/rest/api/2/issue/{key}/watchers?username={name}` |

## MCP Tool Mapping

| Operation | MCP Tool | Method | Notes |
|---|---|---|---|
| Get | `mcp__plugin_atlassian_tools__fetch` | GET | |
| Add | `mcp__plugin_atlassian_tools__fetch` | POST | Body: accountId string (Cloud) or username (Server) |
| Remove | `mcp__plugin_atlassian_tools__fetch` | DELETE | Via query parameter |
