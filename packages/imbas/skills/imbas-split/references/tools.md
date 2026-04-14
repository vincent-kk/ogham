# Tools Used

## imbas MCP Tools

| Tool | Usage |
|------|-------|
| `mcp_tools_run_get` | Load run state, verify preconditions |
| `mcp_tools_run_transition` | start_phase(split), complete_phase(split), escape_phase(split) |
| `mcp_tools_manifest_save` | Save stories-manifest.json |
| `mcp_tools_manifest_validate` | Validate manifest structural integrity |

## Jira Operations ([OP:])

| Tool | Usage |
|------|-------|
| `[OP: get_issue]` | Verify Epic existence when --epic provided |
| `[OP: search_jql]` | Search for existing related Stories/Epics |

The LLM resolves which tool to use at runtime based on the session's available tools.

## Agent Spawn

| Agent | Model | Purpose |
|-------|-------|---------|
| `planner` | config.defaults.llm_model.split | INVEST-compliant Story splitting from source document |
| `analyst` | config.defaults.llm_model.split | Reverse-inference verification (Step 4 [2]) |

### planner Spawn Instructions

- Provide source.md + supplements + Epic info as input context
- Set output language per config.language.issue_content
- Agent returns JSON Story array — skill handles manifest creation
- Agent does NOT have pipeline/manifest tool access

### analyst Spawn Instructions (Reverse-Inference)

- Provide ALL split Stories reassembled as a single document
- Provide original source.md for comparison
- Agent returns mismatch report — skill interprets results and sets flags
- Agent does NOT modify Stories directly
