# Tools Used

## imbas MCP Tools

| Tool | Usage |
|------|-------|
| `mcp_tools_config_get` | Read current config.json (show subcommand) |
| `mcp_tools_config_set` | Create or update config.json fields |
| `mcp_tools_cache_get` | Read Jira metadata cache (show subcommand — displays cache status alongside config) |
| `mcp_tools_cache_set` | Write Jira metadata to cache files |

## Jira Operations ([OP:])

| Operation | Usage |
|-----------|-------|
| [`[OP: get_projects]`](../../_shared/operations/get_projects.md) | List available Jira projects for selection |
| [`[OP: get_issue_types]`](../../_shared/operations/get_issue_types.md) | Fetch issue types for selected project |
| [`[OP: get_issue_type_fields]`](../../_shared/operations/get_issue_type_fields.md) | Fetch required fields per issue type |
| [`[OP: get_link_types]`](../../_shared/operations/get_link_types.md) | Fetch available issue link types |

The LLM resolves which tool to use at runtime. Read the linked operation files for REST fallback details.

## GitHub Operations (provider = github)

| Tool | Usage |
|------|-------|
| `gh repo view --json nameWithOwner` | Detect current repository for project_ref |
| `gh label list --repo <r> --json name` | Fetch label inventory for cache |
| `gh label create <name> --repo <r>` | Bootstrap missing type/status labels |

## Health Check Tools (Step 0)

| Tool | Source | Usage |
|------|--------|-------|
| [`[OP: auth_check]`](../../_shared/operations/auth_check.md) | Atlassian | Verify Atlassian connectivity and retrieve user identity |
| `which gh` | Bash | Check if GitHub CLI is installed |
| `gh auth status` | Bash | Check GitHub CLI authentication status |

The LLM resolves `[OP: auth_check]` at runtime. Read the linked operation file for REST fallback details.

## Agent Spawn

No agent spawn required. This skill executes directly.
