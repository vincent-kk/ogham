## Endpoints

| Operation | HTTP | Cloud Endpoint | Server Endpoint |
|---|---|---|---|
| Get link types | GET | `/rest/api/3/issueLinkType` | `/rest/api/2/issueLinkType` |
| Create link | POST | `/rest/api/3/issueLink` | `/rest/api/2/issueLink` |
| Delete link | DELETE | `/rest/api/3/issueLink/{linkId}` | `/rest/api/2/issueLink/{linkId}` |
| Remote links | GET | `/rest/api/3/issue/{key}/remotelink` | `/rest/api/2/issue/{key}/remotelink` |
| Create remote | POST | `/rest/api/3/issue/{key}/remotelink` | `/rest/api/2/issue/{key}/remotelink` |

## MCP Tool Mapping

| Operation | MCP Tool | Notes |
|---|---|---|
| Get types/remote | `get` | |
| Create | `post` | |
| Delete | `delete` | |
