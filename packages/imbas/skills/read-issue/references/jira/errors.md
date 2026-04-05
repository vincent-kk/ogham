# Error Handling — Jira Provider

| Error | Action |
|-------|--------|
| Issue not found | Return error: "Issue `{key}` not found in Jira" |
| Atlassian MCP not connected | Return error: "Atlassian MCP not available" |
| Malformed comment body | Log warning, skip malformed comment, continue processing |
| Digest marker parse failure | Log warning, fall back to Full Path (ignore malformed digest) |
