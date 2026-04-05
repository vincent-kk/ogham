# Tools Used

## Tools Used

### imbas MCP Tools

| Tool | Usage |
|------|-------|
| `run_get` | Load run state, verify preconditions |
| `run_transition` | start_phase(devplan), complete_phase(devplan) |
| `manifest_get` | Load stories-manifest.json to read Story data |
| `manifest_save` | Save devplan-manifest.json |
| `manifest_validate` | Validate devplan manifest structural integrity |
| `ast_search` | AST pattern search for code exploration (engineer agent) |
| `ast_analyze` | Dependency graph and complexity analysis (engineer agent) |

### Atlassian MCP Tools

| Tool | Usage |
|------|-------|
| `getJiraIssue` | Read Story details from Jira (latest state, comments) |
| `searchJiraIssuesUsingJql` | Search for related existing issues in Jira |

## Agent Spawn

| Agent | Model | Purpose |
|-------|-------|---------|
| `imbas-engineer` | config.defaults.llm_model.devplan (opus) | Codebase exploration, EARS Subtask generation, Task extraction |

### imbas-engineer Spawn Instructions

- Provide stories-manifest.json (filtered by --stories if specified)
- Provide codebase root path for exploration
- Grant access to ast_search and ast_analyze tools
- Agent also uses Read, Grep, Glob for code exploration
- Set subtask_limits from config.json
- Agent returns devplan-manifest.json content — skill handles state updates
- Agent does NOT have pipeline state tools — skill manages all transitions
- If AST tools return sgLoadError, instruct agent to use LLM fallback mode
