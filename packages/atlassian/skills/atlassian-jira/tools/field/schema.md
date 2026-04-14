## Endpoints

| Operation | HTTP | Cloud Endpoint | Server Endpoint |
|---|---|---|---|
| List fields | GET | `/rest/api/3/field` | `/rest/api/2/field` |
| Field options | GET | `/rest/api/3/field/{fieldId}/context/{contextId}/option` | Not available |
| Issue type fields | GET | `/rest/api/3/issue/createmeta/{projectIdOrKey}/issuetypes/{issueTypeId}` | `/rest/api/2/issue/createmeta?projectKeys={key}` |

## Cloud vs Server Branching

- **Cloud**: Field Options API available for custom field option management
- **Server**: No Field Options API. Use issue create metadata instead.

## MCP Tool Mapping

| Operation | MCP Tool | Method | Notes |
|---|---|---|---|
| All operations | `mcp_tools_fetch` | GET | Read-only metadata queries |
