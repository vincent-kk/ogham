# analytics

Cloud only — the MCP layer rejects `/analytics` on Server/DC. `service: "confluence"`.

| Operation  | Method | Endpoint                          | Notes                                       |
| ---------- | ------ | --------------------------------- | ------------------------------------------- |
| Page views | GET    | `/analytics/content/{id}/views`   | `query_params: { fromDate?: "YYYY-MM-DD" }` |
| Viewers    | GET    | `/analytics/content/{id}/viewers` | Distinct viewer count; same params          |
