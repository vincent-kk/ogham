# Tools Used — Provider-agnostic

Provider-specific tools are in `jira/tools.md` and `local/tools.md`.

## imbas MCP Tools (all providers)

| Tool | Usage |
|------|-------|
| `mcp_tools_config_get` | Read `config.provider` to route Step 0 dispatch to the correct provider workflow file |

## Agent Spawn

No agent spawn. This skill executes directly and returns structured data to
the caller, regardless of provider.
