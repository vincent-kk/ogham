# Tools Used

## imbas MCP Tools

| Tool                                                  | Usage                                                                        |
| ----------------------------------------------------- | ---------------------------------------------------------------------------- |
| `mcp__plugin_imbas_tools__config_get` (declared-only) | Provider, language, labels — invoked from the creation skeleton in SKILL.md  |
| `mcp__plugin_imbas_tools__run_get`                    | Load run state, verify preconditions, run selection                          |
| `mcp__plugin_imbas_tools__run_transition`             | skip_phases(estimate), start_phase/complete_phase/escape_phase(split)        |
| `mcp__plugin_imbas_tools__manifest_save`              | Save stories-manifest.json (after decomposition and after EACH created item) |
| `mcp__plugin_imbas_tools__manifest_validate`          | Validate manifest structural integrity                                       |

Manifest reads use the Read tool directly on `stories-manifest.json` / `estimation.json` — there is no manifest_get tool.

## Jira Operations ([OP:])

| Operation                                                    | Usage                                      |
| ------------------------------------------------------------ | ------------------------------------------ |
| [`[OP: get_issue]`](../../.shared/operations/get_issue.md)   | Verify Epic existence when --epic provided |
| [`[OP: search_jql]`](../../.shared/operations/search_jql.md) | Search for existing related Stories/Epics  |

Creation-stage Jira operations (create_issue, create_link, transition_issue, …) are documented in `references/jira/` and loaded only when `config.provider === 'jira'`.

## Agent Spawn

Spawn via the Task tool with the plugin-namespaced type: `subagent_type: "imbas:<agent>"` (e.g., `imbas:analyst`). Bare names are table labels only.

| Agent     | Model                           | Purpose                                          |
| --------- | ------------------------------- | ------------------------------------------------ |
| `planner` | config.defaults.llm_model.split | INVEST-compliant issue splitting from refined.md |
| `analyst` | config.defaults.llm_model.split | Reverse-inference verification (Step 4 [2])      |

### planner Spawn Instructions

- Provide refined.md + supplements + estimation.json (if present) + Epic info as input context
- Set output language per config.language.issue_content
- Agent returns JSON Story array — skill handles manifest creation
- Agent does NOT have pipeline/manifest tool access

### analyst Spawn Instructions (Reverse-Inference)

- Provide ALL split Stories reassembled as a single document
- Provide refined.md for comparison
- Agent returns mismatch report — skill interprets results and sets flags
- Agent does NOT modify Stories directly
