# imbas-validate — Tools Used & Agent Spawn

## Tools Used

### imbas MCP Tools

| Tool | Usage |
|------|-------|
| `config_get` | Load config.json for language/default project resolution (Step 1) |
| `run_create` | Create run directory, copy source, initialize state.json |
| `run_get` | Read current run state for precondition checks (declared-only) |
| `run_transition` | start_phase (validate) → complete_phase (validate) with result |

### Jira Operations ([OP:])

| Tool | Usage |
|------|-------|
| `[OP: get_confluence]` | Fetch Confluence page content when source is a URL |
| `[OP: search_confluence]` | Resolve references to other Confluence pages |

## Agent Spawn

| Agent | Model | Purpose |
|-------|-------|---------|
| `imbas-analyst` | config.defaults.llm_model.validate | Perform 5-type validation (contradictions, divergences, omissions, infeasibilities, testability) |

Spawn instructions:
- Provide source.md + all supplements as input context
- Set language for report output per config.language.reports
- Agent returns validation-report.md content — skill saves it to the run directory
- Agent does NOT have access to pipeline/manifest tools — skill handles all state updates
