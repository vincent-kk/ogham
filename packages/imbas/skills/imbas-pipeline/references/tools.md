# Tools Used & Agent Spawn

Combined tool and agent table for the full pipeline. Aggregates tools from
validate, split, manifest, and devplan skills.

---

## imbas MCP Tools

| Tool | Phase | Usage |
|------|-------|-------|
| `mcp_tools_config_get` | 0 | Load config.json for project key and settings (Phase 0 Step 0.2) |
| `mcp_tools_run_create` | 1 | Create run directory, copy source, initialize state.json |
| `mcp_tools_run_get` | all | Read current run state for precondition checks (declared-only) |
| `mcp_tools_run_transition` | all | Phase transitions: start, complete, escape |
| `mcp_tools_manifest_get` | 3 | Load stories-manifest.json for devplan input |
| `mcp_tools_manifest_save` | 2, 3, 2.5, 3.5 | Save manifest after generation and after each Jira item creation |
| `mcp_tools_manifest_validate` | 2, 3 | Validate manifest structural integrity (gate input) |
| `mcp_tools_manifest_plan` | 2.5, 3.5 | Generate execution plan for dry-run preview |
| `mcp_tools_ast_search` | 3 | AST pattern search via `engineer` spawn; referenced in workflow for sgLoadError handling (declared-only) |
| `mcp_tools_ast_analyze` | 3 | Dependency graph / complexity analysis via `engineer` spawn (declared-only) |

---

## Jira Operations ([OP:])

The LLM resolves which tool to use at runtime based on the session's available tools.

### Read Operations

| Operation | Phase | Usage |
|-----------|-------|-------|
| `[OP: get_confluence]` | 1 | Fetch Confluence page when source is a URL |
| `[OP: search_confluence]` | 1 | Resolve references to other Confluence pages |
| `[OP: get_issue]` | 0, 2 | Verify --parent issue existence and detect type (Epic/Story) |
| `[OP: search_jql]` | 2, 3 | Search for existing related Stories/Epics |
| `[OP: get_transitions]` | 2.5 | Get available transitions for Done processing |

### Write Operations

| Operation | Phase | Usage |
|-----------|-------|-------|
| `[OP: create_issue]` | 2.5, 3.5 | Create Epic, Story, Task, Sub-task issues |
| `[OP: create_link]` | 2.5, 3.5 | Create blocks, split-into, relates-to links |
| `[OP: edit_issue]` | 2.5 | Update issue fields after creation (if needed) |
| `[OP: transition_issue]` | 2.5 | Transition status (horizontal split: original → Done) |
| `[OP: add_comment]` | 3.5 | Post B→A feedback comments to Story issues |

---

## Agent Spawn

| Agent | Phase | Model | Purpose | Spawned By |
|-------|-------|-------|---------|------------|
| `analyst` | 1 | sonnet | 5-type document validation (contradictions, divergences, omissions, infeasibilities, testability) | Phase 1 Step 1.3 |
| `planner` | 2 | sonnet | INVEST-compliant Story splitting with User Story + AC | Phase 2 Step 2.3 |
| `analyst` | 2 | sonnet | Reverse-inference verification (reassemble Stories vs original) | Phase 2 Step 2.4[2] |
| `engineer` | 3 | opus | Codebase exploration, EARS Subtask generation, Task extraction | Phase 3 Step 3.2 |

### Agent Access Control

Agents do NOT have access to pipeline state tools. The `imbas:pipeline` skill handles all state updates:

- Agents produce output (reports, manifests, verification results)
- Pipeline skill interprets output and calls mcp_tools_run_transition / mcp_tools_manifest_save
- This preserves Plan-then-Execute: agents plan, pipeline executes

### Model Configuration

Agent models are configurable via config.json:

```json
{
  "defaults": {
    "llm_model": {
      "validate": "sonnet",
      "split": "sonnet",
      "devplan": "opus"
    }
  }
}
```

Pipeline reads these settings and spawns agents with the configured models.

---

## No Agent Spawn

Pipeline does NOT spawn agents for:
- Manifest execution (Phase 2.5, 3.5) — direct Jira operations via [OP:] notation
- Epic/parent decision — deterministic from --parent argument (resolved in Phase 0)
- Gate evaluation — `imbas:pipeline` skill evaluates fields directly
