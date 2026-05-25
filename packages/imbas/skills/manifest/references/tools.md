# Tools Used — Provider-agnostic

Provider-specific tools (Jira operations ([OP:]) for jira, Read/Write/Edit/Glob for local)
are documented in `jira/tools.md` and `local/tools.md`. This file lists the
shared imbas MCP tools used by every provider.

## imbas MCP Tools (all providers)

| Tool | Usage |
|------|-------|
| `mcp_tools_run_get` | Read current run state (preconditions + run selection via `--run` or most recent) |
| `mcp_tools_manifest_get` | Load manifest file with summary (pending/created counts) |
| `mcp_tools_manifest_save` | Save manifest after each item creation (crash recovery) |
| `mcp_tools_manifest_plan` | Generate execution plan for devplan manifest (dry-run) |

## Output

Updated manifest file with `issue_ref` and `status` fields populated for each
created item. The storage location for created entities is provider-specific:

- `jira`  → Atlassian Cloud (external, referenced by key)
- `local` → `.imbas/<KEY>/issues/{stories,tasks,subtasks}/<ID>.md`

## Agent Spawn

No agent spawn required. This skill executes directly using manifest data and
the provider's tool surface loaded via the dispatch table in `SKILL.md`.
