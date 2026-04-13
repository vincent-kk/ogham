## Endpoints

| Operation | HTTP | Endpoint |
|---|---|---|
| Dev summary | GET | `/rest/dev-status/1.0/issue/summary?issueId={id}` |
| Dev detail | GET | `/rest/dev-status/1.0/issue/detail?issueId={id}&applicationType={type}&dataType={type}` |

## Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| issueId | string | Y | Issue ID (not key) |
| applicationType | string | N | Filter: GitHub, Bitbucket, etc. |
| dataType | string | N | Filter: repository, branch, pullrequest |

## MCP Tool Mapping

| Operation | MCP Tool | Notes |
|---|---|---|
| All operations | `get` | Read-only. Requires issue ID, not key. |
