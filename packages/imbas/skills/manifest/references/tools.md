# Tools Used

## imbas MCP Tools

| Tool | Usage |
|------|-------|
| `imbas_manifest_get` | Load manifest file with summary (pending/created counts) |
| `imbas_manifest_save` | Save manifest after each item creation (crash recovery) |
| `imbas_manifest_plan` | Generate execution plan for devplan manifest (dry-run) |

## Atlassian MCP Tools

| Tool | Usage |
|------|-------|
| `createJiraIssue` | Create Epic, Story, Task, Sub-task issues |
| `createIssueLink` | Create links between issues (Blocks, is split into, relates to) |
| `editJiraIssue` | Update issue fields after creation (if needed) |
| `transitionJiraIssue` | Transition issue status (e.g., mark split-source Story as Done) |
| `addCommentToJiraIssue` | Post B→A feedback comments to Story issues |
| `getTransitionsForJiraIssue` | Get available transitions before transitioning |

## Output

Updated manifest file with jira_key and status fields populated for each created item.

## Agent Spawn

No agent spawn required. This skill executes directly using manifest data
and Atlassian MCP tools.
