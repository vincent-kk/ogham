# Tools Used — Jira Provider

Loaded when `config.provider === 'jira'`. Provider-agnostic imbas MCP tools
(`mcp_tools_run_get`, `mcp_tools_manifest_get`, `mcp_tools_manifest_save`, `mcp_tools_manifest_plan`) are documented in
`../tools.md` and are used by all providers.

## Jira Operations

| Operation | Usage |
|-----------|-------|
| [`[OP: create_issue]`](../../../_shared/operations/create_issue.md) | Create Epic, Story, Task, Sub-task issues |
| [`[OP: create_link]`](../../../_shared/operations/create_link.md) | Create links between issues (Blocks, is split into, relates to) |
| [`[OP: edit_issue]`](../../../_shared/operations/edit_issue.md) | Update issue fields after creation (if needed) |
| [`[OP: transition_issue]`](../../../_shared/operations/transition_issue.md) | Transition issue status (e.g., mark split-source Story as Done) |
| [`[OP: add_comment]`](../../../_shared/operations/add_comment.md) | Post B→A feedback comments to Story issues |
| [`[OP: get_transitions]`](../../../_shared/operations/get_transitions.md) | Get available transitions before transitioning |
| [`[OP: get_issue]`](../../../_shared/operations/get_issue.md) | Used by Step 2.5 drift check to verify remote state |

The LLM resolves which tool to use at runtime. Read the linked operation files for REST fallback details.
