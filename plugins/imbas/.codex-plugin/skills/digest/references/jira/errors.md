# Error Handling — Jira Provider

| Error | Action |
|-------|--------|
| No Jira-capable tool available | Display: "No Jira-capable tool available. Connect an Atlassian-compatible tool first." |
| `[OP: add_comment]` fails | Display error details. Offer to save digest as a local file instead. |
| Media fetch failure | Log warning, continue digest without media context. |
| Existing digest marker malformed during re-run | Log warning, treat as "no prior digest" and run Full Path. |
