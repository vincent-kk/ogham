# Tools Used — Jira Provider

Loaded when `config.provider === 'jira'`. Provider-agnostic imbas MCP tools
(`run_get`, `manifest_get`, `manifest_save`, `manifest_plan`) are documented in
`../tools.md` and are used by all providers.

## Atlassian MCP Tools

| Tool | Usage |
|------|-------|
| `createJiraIssue` | Create Epic, Story, Task, Sub-task issues |
| `createIssueLink` | Create links between issues (Blocks, is split into, relates to) |
| `editJiraIssue` | Update issue fields after creation (if needed) |
| `transitionJiraIssue` | Transition issue status (e.g., mark split-source Story as Done) |
| `addCommentToJiraIssue` | Post B→A feedback comments to Story issues |
| `getTransitionsForJiraIssue` | Get available transitions before transitioning |
| `getJiraIssue` | Used by Step 2.5 drift check to verify remote state |

The `atlassian` MCP server must be registered in `.mcp.json`. This skill never
calls Jira HTTP APIs directly — all tracker interaction flows through the MCP
server's tool surface.
