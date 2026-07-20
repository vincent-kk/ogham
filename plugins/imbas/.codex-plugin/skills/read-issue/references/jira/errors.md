# Error Handling — Jira Provider

| Error | Action |
|-------|--------|
| Issue not found | Return error: "Issue `{key}` not found in Jira" |
| No Jira-capable tool available | Return error: "No Jira-capable tool available" |
| Malformed comment body | Log warning, skip malformed comment, continue processing |
| Digest marker parse failure | Log warning, fall back to Full Path (ignore malformed digest) |
