# Tools Used — Jira Provider

Loaded when `config.provider === 'jira'`.

## Atlassian MCP Tools

| Tool | Usage |
|------|-------|
| `addCommentToJiraIssue` | Post the formatted digest comment to Jira (Step 6 publish) |
| `getJiraIssue` | Used transitively by `imbas:read-issue` Jira branch to load the comment thread |

Media attachments (images, videos, GIFs) are handled by the `/imbas:imbas-fetch-media`
skill which also goes through the `atlassian` MCP server.
