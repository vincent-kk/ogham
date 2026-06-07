# Tools Used — Jira Provider

## Jira Operations

| Operation | Usage |
|-----------|-------|
| [`[OP: get_issue]`](../../../_shared/operations/get_issue.md) | Fetch issue details including `subtasks` array |

The LLM resolves which tool to use at runtime. Read the linked operation file for REST fallback details.

## imbas MCP Tools

| Tool | Usage |
|------|-------|
| `mcp_tools_config_get` | Read `config.jira.base_url` for URL construction |
