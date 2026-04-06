# Health Check

Non-blocking environment check executed at Step 0 of init workflow.
Verifies remote tool availability and offers optional auto-setup for missing items.

## Check Procedures

### Atlassian MCP

```
1. Call atlassianUserInfo tool.
2. On success:
   - Extract displayName (or emailAddress as fallback).
   - Status: ✓ Atlassian connected (user: <displayName>)
3. On tool-not-found (tool does not exist in session):
   - Status: ✗ Atlassian MCP — not connected
   - Setup action: register-atlassian-mcp
4. On error (tool exists but call fails):
   - Status: ✗ Atlassian MCP — connection failed (<error message>)
   - Setup action: none (manual troubleshooting required)
```

### GitHub CLI

```
1. Run: which gh
2. If not found:
   - Status: ✗ GitHub CLI — not installed
   - Setup action: install-gh
3. If found, run: gh auth status
4. On success:
   - Extract login username from output.
   - Status: ✓ GitHub CLI authenticated (user: <login>)
5. On failure:
   - Status: △ GitHub CLI installed but not authenticated
   - Setup action: auth-gh
```

## Output Format

```
Remote Tool Status:
  <status-icon> Atlassian MCP — <status message>
  <status-icon> GitHub CLI — <status message>

# If all available:
All remote tools ready.

# If any missing:
⚠ Remote ticket management requires at least one of the above.
  Local-only workflows are fully supported without them.

  [1] Atlassian MCP — register in .mcp.json
  [2] GitHub CLI (gh) — install via npm

Set up now? Enter numbers (e.g. 1,2) or [skip]:
```

## Auto-Setup Actions

### register-atlassian-mcp

Add Atlassian MCP server entry to the project's `.mcp.json`:

```json
{
  "mcpServers": {
    "atlassian": {
      "type": "http",
      "url": "https://mcp.atlassian.com/v1/mcp"
    }
  }
}
```

Steps:
1. Read existing `.mcp.json` (or create if absent).
2. Merge `atlassian` key into `mcpServers`.
3. Write updated `.mcp.json`.
4. Display: "Atlassian MCP registered in .mcp.json."
5. Display: "⚠ Restart Claude Code or reload MCP servers to activate."
6. Display: "On first use, Atlassian will prompt for OAuth authentication in your browser."

### install-gh

Install GitHub CLI globally:

```
npm install -g gh
```

Steps:
1. Run: `npm install -g gh`
2. On success → display: "GitHub CLI installed."
3. On failure → display: "Failed to install gh. Try manually: npm install -g gh"
4. After install, run: `gh auth status`
5. If not authenticated → proceed to auth-gh action.

### auth-gh

Guide user through GitHub CLI authentication:

```
1. Display: "GitHub CLI requires authentication."
2. Display: "Run the following command in your terminal:"
3. Display: "  ! gh auth login"
4. Note: Authentication requires interactive browser flow — cannot be automated.
```

## Status Icons

| Icon | Meaning |
|------|---------|
| ✓ | Available and working |
| △ | Partially available (installed but not authenticated) |
| ✗ | Not available |
