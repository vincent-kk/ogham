# digest — Tools Used & Agent Spawn

## Tools Used

### Atlassian MCP Tools (via delegated skills)

| Tool | Usage | Via |
|------|-------|----|
| `getJiraIssue` | Read issue with full comment thread | `imbas:read-issue` skill |
| `addCommentToJiraIssue` | Post digest comment to Jira | direct call |
| `fetchAtlassian` | Download attached media files | `/imbas:fetch-media` user-invocable skill |

## Agent Spawn

No direct agent spawn. Digest delegates to other skills:
- `imbas:read-issue` — for structured issue context (internal skill, `user_invocable: false`)
- `/imbas:fetch-media` — for attached media analysis (user-invocable skill, `user_invocable: true`)
