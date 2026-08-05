# Tools Used — Jira Provider

Loaded when `config.provider === 'jira'`. Provider-agnostic imbas MCP tools (`mcp__plugin_imbas_tools__run_get`, `mcp__plugin_imbas_tools__manifest_save`, `mcp__plugin_imbas_tools__manifest_validate`) are documented in `../tools.md` and are used by all providers.

## Jira Operations

| Operation                                                                   | Usage                                                           |
| --------------------------------------------------------------------------- | --------------------------------------------------------------- |
| [`[OP: create_issue]`](../../../.shared/operations/create_issue.md)         | Create Epic, Story, Task, Sub-task issues                       |
| [`[OP: create_link]`](../../../.shared/operations/create_link.md)           | Create links between issues (Blocks, is split into, relates to) |
| [`[OP: edit_issue]`](../../../.shared/operations/edit_issue.md)             | Update issue fields after creation (if needed)                  |
| [`[OP: transition_issue]`](../../../.shared/operations/transition_issue.md) | Transition issue status (e.g., mark split-source Story as Done) |
| [`[OP: add_comment]`](../../../.shared/operations/add_comment.md)           | Post B→A feedback comments to Story issues                      |
| [`[OP: get_transitions]`](../../../.shared/operations/get_transitions.md)   | Get available transitions before transitioning                  |
| [`[OP: get_issue]`](../../../.shared/operations/get_issue.md)               | Used by Step 2.5 drift check to verify remote state             |

The LLM resolves which tool to use at runtime. Read the linked operation files for REST fallback details.
