# Tools Used — Jira Provider

Loaded when `config.provider === 'jira'`. Shared imbas MCP tools are in
`../tools.md`.

## Jira Operations

| Operation | Usage |
|-----------|-------|
| [`[OP: get_issue]`](../../../_shared/operations/get_issue.md) | Read Story details from Jira (latest state, comments) — optional enrichment during Step 2 exploration |
| [`[OP: search_jql]`](../../../_shared/operations/search_jql.md) | Search for related existing issues in Jira — optional during Step 2 |

Both are **optional** during this skill's execution. The `engineer` agent
does not require them; if no Jira-capable tool is configured the agent proceeds
with codebase-only exploration.

The LLM resolves which tool to use at runtime. Read the linked operation files for REST fallback details.
