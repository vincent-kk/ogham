# Error Handling — Jira Provider

| Error | Action |
|-------|--------|
| Atlassian MCP not connected | Display: "Atlassian MCP server is not available. Connect it first." |
| `addCommentToJiraIssue` fails | Display error details. Offer to save digest as a local file instead. |
| Media fetch failure | Log warning, continue digest without media context. |
| Existing digest marker malformed during re-run | Log warning, treat as "no prior digest" and run Full Path. |
