# Tools Used — Combined

## imbas MCP Tools

| Tool                                         | Phases        | Usage                                                                  |
| -------------------------------------------- | ------------- | ---------------------------------------------------------------------- |
| `mcp__plugin_imbas_tools__config_get`        | 0             | Option resolution (project, provider, estimation coefficients, labels) |
| `mcp__plugin_imbas_tools__run_create`        | 1             | Run directory + source snapshot + initial state                        |
| `mcp__plugin_imbas_tools__run_get` (declared-only) | all     | State reads between phases                                             |
| `mcp__plugin_imbas_tools__run_transition`    | all           | start/complete/skip/escape phase transitions                           |
| `mcp__plugin_imbas_tools__manifest_save`     | 2, 3          | estimation.json / stories-manifest.json (validated save, per-item)     |
| `mcp__plugin_imbas_tools__manifest_validate` | GATE 2, 3     | Estimation and stories manifest integrity                              |

Manifest and artifact reads use the Read tool directly (refined.md, estimation.json, stories-manifest.json).

## [OP:] Operations

| Operation                | Phase | Usage                                    |
| ------------------------ | ----- | ---------------------------------------- |
| `[OP: get_confluence]`   | 1     | Confluence URL source                    |
| `[OP: search_confluence]`| 1     | Referenced pages → supplements           |
| `[OP: get_issue]`        | 0, 3  | Parent Epic verification; drift checks   |

Creation-stage provider operations are those of the split skill — see `skills/split/references/<provider>/`.

## Agent Spawn

Spawn via the Task tool with the plugin-namespaced type (`subagent_type: "imbas:<agent>"`).

| Agent       | Model                              | Phase | Purpose                                            |
| ----------- | ---------------------------------- | ----- | -------------------------------------------------- |
| `analyst`   | config.defaults.llm_model.refine   | 1     | 5-type validation + restructuring                  |
| `estimator` | config.defaults.llm_model.estimate | 2     | 3-view decomposition, PERT, schedule               |
| `planner`   | config.defaults.llm_model.split    | 3     | INVEST issue splitting                             |
| `analyst`   | config.defaults.llm_model.split    | 3     | Reverse-inference verification                     |
