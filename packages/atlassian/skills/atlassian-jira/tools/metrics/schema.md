## Endpoints

Metrics are calculated from issue changelog data, not a dedicated API.

| Operation | HTTP | Cloud Endpoint | Server Endpoint |
|---|---|---|---|
| Get changelog | GET | `/rest/api/3/issue/{key}/changelog` | `/rest/api/2/issue/{key}/changelog` |
| Get with history | GET | `/rest/api/3/issue/{key}?expand=changelog` | `/rest/api/2/issue/{key}?expand=changelog` |

## Calculated Metrics

| Metric | Calculation |
|---|---|
| Cycle time | Time from first "In Progress" to "Done" status |
| Lead time | Time from creation to "Done" status |
| Status duration | Time spent in each status |

## MCP Tool Mapping

| Operation | MCP Tool | Method | Notes |
|---|---|---|---|
| Get changelog | `mcp_tools_fetch` | GET | Use expand=changelog for inline data |
