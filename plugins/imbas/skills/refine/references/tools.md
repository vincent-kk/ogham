# refine — Tools Used & Agent Spawn

## Tools Used

### imbas MCP Tools

| Tool                                      | Usage                                                             |
| ----------------------------------------- | ----------------------------------------------------------------- |
| `mcp__plugin_imbas_tools__config_get`     | Load config.json for language/default project resolution (Step 1) |
| `mcp__plugin_imbas_tools__run_create`     | Create run directory, copy source, initialize state.json          |
| `mcp__plugin_imbas_tools__run_get`        | Read current run state for precondition checks (declared-only)    |
| `mcp__plugin_imbas_tools__run_transition` | start_phase (refine) → complete_phase (refine) with result        |

### Jira Operations ([OP:])

| Operation                                                                  | Usage                                              |
| -------------------------------------------------------------------------- | -------------------------------------------------- |
| [`[OP: get_confluence]`](../../.shared/operations/get_confluence.md)       | Fetch Confluence page content when source is a URL |
| [`[OP: search_confluence]`](../../.shared/operations/search_confluence.md) | Resolve references to other Confluence pages       |

The LLM resolves which tool to use at runtime. Read the linked operation files for REST fallback details.

## Agent Spawn

Spawn via the Task tool with the plugin-namespaced type: `subagent_type: "imbas:<agent>"` (e.g., `imbas:analyst`). Bare names are table labels only.

| Agent     | Model                            | Purpose                                                                                                       |
| --------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `analyst` | config.defaults.llm_model.refine | Perform 5-type validation, then restructure the document into the standard refined.md layout (unless BLOCKED) |

Spawn instructions:

- Provide source.md + all supplements as input context
- Set language: validation-report per config.language.reports, refined.md per config.language.documents
- Agent returns validation-report.md and refined.md content — skill saves both to the run directory
- Agent does NOT have access to pipeline/manifest tools — skill handles all state updates
