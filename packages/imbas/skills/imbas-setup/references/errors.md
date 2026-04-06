# Error Handling

| Error | Action |
|-------|--------|
| No Jira-capable tool available | Display: "No Jira-capable tool detected. Register a Jira MCP server or plugin, then run /imbas:imbas-setup again." |
| [OP: get_projects] returns empty | Display: "No Jira projects found. Check your Jira permissions." |
| .imbas/ already exists (on init) | Ask user: "Existing .imbas/ found. Overwrite config? (y/n)" — only overwrites config.json, preserves runs/ |
| Cache fetch partial failure | Log warning for failed cache type, continue with others. Display which caches failed. |
| Invalid project key | Display: "Project <KEY> not found in Jira. Available projects: ..." |

# State Transitions

This skill does not interact with run state (state.json). It manages config.json and cache files only.

- Creates: `.imbas/config.json`, `.imbas/<KEY>/cache/*.json`
- Modifies: `.imbas/config.json` (set-project, set-language)
- Deletes: `.imbas/.temp/` (clear-temp only)
