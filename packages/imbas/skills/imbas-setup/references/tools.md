# Tools Used

## imbas MCP Tools

| Tool | Usage |
|------|-------|
| `config_get` | Read current config.json (show subcommand) |
| `config_set` | Create or update config.json fields |
| `cache_get` | Read Jira metadata cache (show subcommand — displays cache status alongside config) |
| `cache_set` | Write Jira metadata to cache files |

## Jira Operations ([OP:])

| Tool | Usage |
|------|-------|
| `[OP: get_projects]` | List available Jira projects for selection |
| `[OP: get_issue_types]` | Fetch issue types for selected project |
| `[OP: get_issue_type_fields]` | Fetch required fields per issue type |
| `[OP: get_link_types]` | Fetch available issue link types |

The LLM resolves which tool to use at runtime based on the session's available tools.

## Agent Spawn

No agent spawn required. This skill executes directly.
