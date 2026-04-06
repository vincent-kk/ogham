# Error Handling

| Error | Action |
|-------|--------|
| Atlassian MCP not in session | Non-blocking. Display: "✗ Atlassian MCP — not connected". Offer auto-setup (register in .mcp.json). |
| Atlassian MCP auth/network error | Non-blocking. Display: "✗ Atlassian MCP — connection failed (<reason>)". Suggest manual troubleshooting. |
| GitHub CLI not installed | Non-blocking. Display: "✗ GitHub CLI — not installed". Offer auto-setup (npm install -g gh). |
| GitHub CLI not authenticated | Non-blocking. Display: "△ GitHub CLI installed but not authenticated". Guide user to run `! gh auth login`. |
| [OP: get_projects] returns empty | [jira] Display: "No Jira projects found. Check your Jira permissions." |
| gh repo view fails | [github] Display: "Could not detect GitHub repo. Enter owner/repo manually." |
| gh label create 403 | [github] Fail-fast. Display: "Insufficient scopes. Run 'gh auth refresh -s repo' and retry." |
| .imbas/ already exists (on init) | Ask user: "Existing .imbas/ found. Overwrite config? (y/n)" — only overwrites config.json, preserves runs/ |
| Cache fetch partial failure | Log warning for failed cache type, continue with others. Display which caches failed. |
| Invalid project key | Display: "Project <KEY> not found in Jira. Available projects: ..." |

# State Transitions

This skill does not interact with run state (state.json). It manages config.json and cache files only.

- Creates: `.imbas/config.json`, `.imbas/<KEY>/cache/*.json`
- Modifies: `.imbas/config.json` (set-project, set-language)
- Deletes: `.imbas/.temp/` (clear-temp only)
