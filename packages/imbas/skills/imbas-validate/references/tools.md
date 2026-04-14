# imbas-validate — Tools Used & Agent Spawn

## Tools Used

### imbas MCP Tools

| Tool | Usage |
|------|-------|
| `mcp_tools_config_get` | Load config.json for language/default project resolution (Step 1) |
| `mcp_tools_run_create` | Create run directory, copy source, initialize state.json |
| `mcp_tools_run_get` | Read current run state for precondition checks (declared-only) |
| `mcp_tools_run_transition` | start_phase (validate) → complete_phase (validate) with result |

### Jira Operations ([OP:])

| Operation | Usage |
|-----------|-------|
| [`[OP: get_confluence]`](../../_shared/operations/get_confluence.md) | Fetch Confluence page content when source is a URL |
| [`[OP: search_confluence]`](../../_shared/operations/search_confluence.md) | Resolve references to other Confluence pages |

The LLM resolves which tool to use at runtime. Read the linked operation files for REST fallback details.

## Agent Spawn

| Agent | Model | Purpose |
|-------|-------|---------|
| `analyst` | config.defaults.llm_model.validate | Perform 5-type validation (contradictions, divergences, omissions, infeasibilities, testability) |

Spawn instructions:
- Provide source.md + all supplements as input context
- Set language for report output per config.language.reports
- Agent returns validation-report.md content — skill saves it to the run directory
- Agent does NOT have access to pipeline/manifest tools — skill handles all state updates
