# Tools Used

## imbas MCP Tools

| Tool | Usage |
|------|-------|
| `mcp_tools_config_get` | Read current config.json (show subcommand) |
| `mcp_tools_config_set` | Create or update config.json fields |
| `mcp_tools_cache_get` | Read Jira metadata cache (show subcommand — displays cache status alongside config) |
| `mcp_tools_cache_set` | Write Jira metadata to cache files |

## Jira Operations ([OP:])

| Tool | Usage |
|------|-------|
| `[OP: get_projects]` | List available Jira projects for selection |
| `[OP: get_issue_types]` | Fetch issue types for selected project |
| `[OP: get_issue_type_fields]` | Fetch required fields per issue type |
| `[OP: get_link_types]` | Fetch available issue link types |

The LLM resolves which tool to use at runtime based on the session's available tools.

## GitHub Operations (provider = github)

| Tool | Usage |
|------|-------|
| `gh repo view --json nameWithOwner` | Detect current repository for project_ref |
| `gh label list --repo <r> --json name` | Fetch label inventory for cache |
| `gh label create <name> --repo <r>` | Bootstrap missing type/status labels |

## Health Check Tools (Step 0)

| Tool | Source | Usage |
|------|--------|-------|
| `mcp_tools_atlassianUserInfo` | Atlassian MCP | Verify Atlassian connectivity and retrieve user identity |
| `which gh` | Bash | Check if GitHub CLI is installed |
| `gh auth status` | Bash | Check GitHub CLI authentication status |

## Agent Spawn

No agent spawn required. This skill executes directly.
