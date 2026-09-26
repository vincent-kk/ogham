# watcher

| Operation      | Method | Endpoint                | Cloud                         | Server/DC                    |
| -------------- | ------ | ----------------------- | ----------------------------- | ---------------------------- |
| List watchers  | GET    | `/issue/{key}/watchers` |                               |                              |
| Add watcher    | POST   | `/issue/{key}/watchers` | `body: "\"<accountId>\""`     | `body: "\"<username>\""`     |
| Remove watcher | DELETE | `/issue/{key}/watchers` | `query_params: { accountId }` | `query_params: { username }` |

The add body is a JSON string literal. String bodies are sent verbatim, so include the surrounding quotes in the string you pass.
