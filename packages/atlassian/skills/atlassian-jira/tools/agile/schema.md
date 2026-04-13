## Endpoints

| Operation | HTTP | Endpoint |
|---|---|---|
| List boards | GET | `/rest/agile/1.0/board` |
| Get board | GET | `/rest/agile/1.0/board/{boardId}` |
| Board issues | GET | `/rest/agile/1.0/board/{boardId}/issue` |
| List sprints | GET | `/rest/agile/1.0/board/{boardId}/sprint` |
| Get sprint | GET | `/rest/agile/1.0/sprint/{sprintId}` |
| Sprint issues | GET | `/rest/agile/1.0/sprint/{sprintId}/issue` |
| Create sprint | POST | `/rest/agile/1.0/sprint` |
| Update sprint | PUT | `/rest/agile/1.0/sprint/{sprintId}` |
| Move to sprint | POST | `/rest/agile/1.0/sprint/{sprintId}/issue` |
| Get epic | GET | `/rest/agile/1.0/epic/{epicId}` |
| Epic issues | GET | `/rest/agile/1.0/epic/{epicId}/issue` |
| Move to epic | POST | `/rest/agile/1.0/epic/{epicId}/issue` |

## Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| boardId | number | Y (board ops) | Board ID |
| sprintId | number | Y (sprint ops) | Sprint ID |
| epicId | number | Y (epic ops) | Epic ID |

## MCP Tool Mapping

| Operation | MCP Tool | Notes |
|---|---|---|
| List/Get | `get` | |
| Create | `post` | |
| Update | `put` | |
| Move issues | `post` | Issues array in body |
