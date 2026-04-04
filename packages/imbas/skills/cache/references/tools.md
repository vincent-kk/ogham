# Tools Used

## Tools Used

### imbas MCP Tools

| Tool | Usage |
|------|-------|
| `imbas_config_get` | Load config.json for config.defaults.project_ref fallback in ensure/refresh actions |
| `imbas_cache_get` | Read cached metadata and check TTL status |
| `imbas_cache_set` | Write fetched metadata to cache files |

### Atlassian MCP Tools

| Tool | Usage |
|------|-------|
| `getVisibleJiraProjects` | Fetch project list to find project metadata |
| `getJiraProjectIssueTypesMetadata` | Fetch issue types for the project |
| `getJiraIssueTypeMetaWithFields` | Fetch required fields for each issue type |
| `getIssueLinkTypes` | Fetch all available issue link types |

## Agent Spawn

No agent spawn. This skill executes directly.
