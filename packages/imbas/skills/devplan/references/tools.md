# Tools Used

## Tools Used

### imbas MCP Tools

| Tool | Usage |
|------|-------|
| `mcp_tools_run_get` | Load run state, verify preconditions |
| `mcp_tools_run_transition` | start_phase(devplan), complete_phase(devplan) |
| `mcp_tools_manifest_get` | Load stories-manifest.json to read Story data |
| `mcp_tools_manifest_save` | Save devplan-manifest.json |
| `mcp_tools_manifest_validate` | Validate devplan manifest structural integrity |
| `mcp_tools_ast_search` | AST pattern search for code exploration (engineer agent) |
| `mcp_tools_ast_analyze` | Dependency graph and complexity analysis (engineer agent) |

### Provider-specific tools

Provider-specific tool surfaces are in `jira/tools.md` and `local/tools.md`.
Both are optional during Step 2 exploration — the core `engineer` agent
tool set (`mcp_tools_ast_search`, `mcp_tools_ast_analyze`, `Read`, `Grep`, `Glob`) is sufficient
to produce a devplan manifest regardless of provider.

## Agent Spawn

| Agent | Model | Purpose |
|-------|-------|---------|
| `engineer` | config.defaults.llm_model.devplan (opus) | Codebase exploration, EARS Subtask generation, Task extraction |

### engineer Spawn Instructions

- Provide stories-manifest.json (filtered by --stories if specified)
- Provide codebase root path for exploration
- Grant access to mcp_tools_ast_search and mcp_tools_ast_analyze tools
- Agent also uses Read, Grep, Glob for code exploration
- Set subtask_limits from config.json
- Agent returns devplan-manifest.json content — skill handles state updates
- Agent does NOT have pipeline state tools — skill manages all transitions
- If AST tools return sgLoadError, instruct agent to use LLM fallback mode
