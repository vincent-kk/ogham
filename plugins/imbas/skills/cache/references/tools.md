# Tools Used

## Tools Used

### imbas MCP Tools

| Tool                                  | Usage                                                                               |
| ------------------------------------- | ----------------------------------------------------------------------------------- |
| `mcp__plugin_imbas_tools__config_get` | Load config.json for config.provider check and config.defaults.project_ref fallback |
| `mcp__plugin_imbas_tools__cache_get`  | Read cached metadata and check TTL status                                           |
| `mcp__plugin_imbas_tools__cache_set`  | Write fetched metadata to cache files                                               |
| `Bash`                                | `clear` action only — `rm -rf .imbas/<KEY>/cache` (no dedicated MCP tool)           |

### Jira Operations ([OP:])

| Operation                                                                          | Usage                                                              |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [`[OP: get_projects]`](../../_shared/operations/get_projects.md)                   | Fetch project list to find project metadata                        |
| [`[OP: get_issue_types]`](../../_shared/operations/get_issue_types.md)             | Fetch issue types for the project                                  |
| [`[OP: get_issue_type_fields]`](../../_shared/operations/get_issue_type_fields.md) | Fetch required fields for each issue type                          |
| [`[OP: get_link_types]`](../../_shared/operations/get_link_types.md)               | Fetch all available issue link types                               |
| [`[OP: get_transitions]`](../../_shared/operations/get_transitions.md)             | Fetch workflow transitions for an existing issue (workflows cache) |

The LLM resolves which tool to use at runtime. Read the linked operation files for REST fallback details.

## Agent Spawn

No agent spawn. This skill executes directly.
