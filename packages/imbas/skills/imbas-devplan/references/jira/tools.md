# Tools Used — Jira Provider

Loaded when `config.provider === 'jira'`. Shared imbas MCP tools are in
`../tools.md`.

## Atlassian MCP Tools

| Tool | Usage |
|------|-------|
| `getJiraIssue` | Read Story details from Jira (latest state, comments) — optional enrichment during Step 2 exploration |
| `searchJiraIssuesUsingJql` | Search for related existing issues in Jira — optional during Step 2 |

Both are **optional** during this skill's execution. The imbas-engineer agent
does not require them; if the `atlassian` MCP server is not configured the
agent proceeds with codebase-only exploration.
