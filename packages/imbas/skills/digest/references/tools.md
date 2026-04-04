# digest — Tools Used & Agent Spawn

## Tools Used

### Atlassian MCP Tools (via internal skills)

| Tool | Usage | Via |
|------|-------|----|
| `getJiraIssue` | Read issue with full comment thread | `imbas:read-issue` skill |
| `addCommentToJiraIssue` | Post digest comment to Jira | direct call |
| `fetchAtlassian` | Download attached media files | via `imbas:fetch-media` internal skill (not called directly by digest) |

## Agent Spawn

No direct agent spawn. Digest uses internal skills:
- `imbas:read-issue` — for structured issue context
- `imbas:fetch-media` — for attached media analysis (when media is present)
