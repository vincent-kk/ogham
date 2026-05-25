# Health Check

Non-blocking environment check executed at Step 0 of init workflow.
Verifies remote tool availability and offers optional auto-setup for missing items.

## Check Procedures

### Atlassian MCP

```
1. [OP: auth_check] — Verify Atlassian connectivity.
   Use any available Atlassian identity/authentication tool,
   or fall back to GET /rest/api/3/myself via a generic HTTP tool.
2. On success:
   - Extract displayName (or emailAddress as fallback).
   - Status: ✓ Atlassian connected (user: <displayName>)
3. On tool-not-found (no Atlassian-capable tool in session):
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

  [1] Atlassian MCP — register in .mcp.json (scope selection)
  [2] GitHub CLI (gh) — install via npm

Set up now? Enter numbers (e.g. 1,2) or [skip]:
```

## Auto-Setup Actions

### register-atlassian-mcp

Add Atlassian MCP server entry to a `.mcp.json` file.
See [MCP Config Scopes](./mcp-config-scopes.md) for scope details.

Server entry:

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
1. Ask user to select scope:
   ```
   Where should the Atlassian MCP server be registered?
     [1] project — .mcp.json (team-shared, git-tracked)
     [2] user    — ~/.mcp.json (all projects, personal)
     [3] local   — .mcp.json.local (this project only, gitignored)
   Select [1]:
   ```
   Default: `project` (most common for team tooling).
2. Resolve target file path:
   - `project` → `<cwd>/.mcp.json`
   - `user` → `~/.mcp.json`
   - `local` → `<cwd>/.mcp.json.local`
3. Read existing target file (or create if absent).
4. Merge `atlassian` key into `mcpServers`.
5. Write updated file.
6. Display: "Atlassian MCP registered in `<target-path>`."
7. Display: "⚠ Restart Claude Code or reload MCP servers to activate."
8. Display: "On first use, Atlassian will prompt for OAuth authentication in your browser."

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

## Provider Availability Mapping

Health check results determine which providers can be offered in Step 1:

| Tool status | Provider unlocked | Notes |
|-------------|-------------------|-------|
| Atlassian ✓ | `jira` | Full Jira Cloud/Server access |
| Atlassian △/✗ | — | jira provider not available |
| GitHub CLI ✓ | `github` | GitHub Issues via gh CLI |
| GitHub CLI △ | — | Installed but not authenticated; offer auth-gh setup |
| GitHub CLI ✗ | — | Not installed; offer install-gh setup |
| (always) | `local` | No remote dependency; always available |

After auto-setup actions complete, re-evaluate availability before proceeding
to provider selection. For example, if the user installs and authenticates gh
during Step 0, `github` becomes available for Step 1.

## Status Icons

| Icon | Meaning |
|------|---------|
| ✓ | Available and working |
| △ | Partially available (installed but not authenticated) |
| ✗ | Not available |
