# Tools Used — Jira Provider

Loaded when `config.provider === 'jira'`. Provider-agnostic imbas MCP tools
(`run_get`, `manifest_get`, `manifest_save`, `manifest_plan`) are documented in
`../tools.md` and are used by all providers.

## Jira Operations

| Operation | Usage |
|-----------|-------|
| `[OP: create_issue]` | Create Epic, Story, Task, Sub-task issues |
| `[OP: create_link]` | Create links between issues (Blocks, is split into, relates to) |
| `[OP: edit_issue]` | Update issue fields after creation (if needed) |
| `[OP: transition_issue]` | Transition issue status (e.g., mark split-source Story as Done) |
| `[OP: add_comment]` | Post B→A feedback comments to Story issues |
| `[OP: get_transitions]` | Get available transitions before transitioning |
| `[OP: get_issue]` | Used by Step 2.5 drift check to verify remote state |

The LLM resolves which tool to use at runtime based on the session's available tools.
