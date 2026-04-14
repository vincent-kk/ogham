# Tools Used

## Tools Used

### imbas MCP Tools

| Tool | Usage |
|------|-------|
| `mcp_tools_config_get` | Load config.json for config.defaults.project_ref fallback in ensure/refresh actions |
| `mcp_tools_cache_get` | Read cached metadata and check TTL status |
| `mcp_tools_cache_set` | Write fetched metadata to cache files |

### Jira Operations ([OP:])

The LLM resolves which tool to use at runtime based on the session's available tools.

| Operation | Usage |
|-----------|-------|
| `[OP: get_projects]` | Fetch project list to find project metadata |
| `[OP: get_issue_types]` | Fetch issue types for the project |
| `[OP: get_issue_type_fields]` | Fetch required fields for each issue type |
| `[OP: get_link_types]` | Fetch all available issue link types |
| `[OP: get_transitions]` | Fetch workflow transitions for an existing issue (workflows cache) |

## Agent Spawn

No agent spawn. This skill executes directly.
