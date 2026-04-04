# digest — Tools Used & Agent Spawn

## Tools Used

### Atlassian MCP Tools (via internal skills)

| Tool | Usage | Via |
|------|-------|----|
| `getJiraIssue` | Read issue with full comment thread | read-issue skill |
| `addCommentToJiraIssue` | Post digest comment to Jira | direct call |
| `fetchAtlassian` | Download attached media files | fetch-media skill |

## Agent Spawn

No direct agent spawn. Digest uses internal skills:
- `read-issue` — for structured issue context
- `fetch-media` — for attached media analysis (when media is present)
