# Tools Used — Jira Provider

## Atlassian MCP Tools

| Tool | Usage |
|------|-------|
| `getJiraIssue` | Fetch issue details including `subtasks` array |

## imbas MCP Tools

| Tool | Usage |
|------|-------|
| `config_get` | Read `config.jira.base_url` for URL construction |

## Operation Notation

| Operation | MCP Tool | Parameters |
|-----------|----------|------------|
| `[OP: get_issue]` | `getJiraIssue` | `issueIdOrKey=<key>` |
