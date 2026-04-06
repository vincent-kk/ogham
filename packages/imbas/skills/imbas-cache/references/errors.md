# Error Handling

## Error Handling

| Error | Action |
|-------|--------|
| No project key (argument or config) | Return error: "No project key specified. Run /imbas:imbas-setup first." |
| No Jira-capable tool available | Return error: "No Jira-capable tool detected. Cache refresh requires Jira access." |
| Partial fetch failure | Log warning for failed cache type, continue with others. Return which types succeeded/failed. |
| Cache directory missing | Create .imbas/<KEY>/cache/ automatically, then proceed with refresh. |
| Config not initialized | Return error: "Config not found. Run /imbas:imbas-setup init first." |
