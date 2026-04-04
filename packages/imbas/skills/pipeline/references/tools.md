# Tools Used & Agent Spawn

Combined tool and agent table for the full pipeline. Aggregates tools from
validate, split, manifest, and devplan skills.

---

## imbas MCP Tools

| Tool | Phase | Usage |
|------|-------|-------|
| `imbas_config_get` | 1 | Load config.json for project key and settings |
| `imbas_run_create` | 1 | Create run directory, copy source, initialize state.json |
| `imbas_run_get` | all | Read current run state (precondition checks) |
| `imbas_run_transition` | all | Phase transitions: start, complete, escape |
| `imbas_manifest_get` | 3 | Load stories-manifest.json for devplan input |
| `imbas_manifest_save` | 2, 3, 2.5, 3.5 | Save manifest after generation and after each Jira item creation |
| `imbas_manifest_validate` | 2, 3 | Validate manifest structural integrity (gate input) |
| `imbas_manifest_plan` | 2.5, 3.5 | Generate execution plan for dry-run preview |

---

## Atlassian MCP Tools

### Read Operations

| Tool | Phase | Usage |
|------|-------|-------|
| `getConfluencePage` | 1 | Fetch Confluence page when source is a URL |
| `searchConfluenceUsingCql` | 1 | Resolve references to other Confluence pages |
| `getJiraIssue` | 0, 2 | Verify --parent issue existence and detect type (Epic/Story) |
| `searchJiraIssuesUsingJql` | 2, 3 | Search for existing related Stories/Epics |
| `getTransitionsForJiraIssue` | 2.5 | Get available transitions for Done processing |

### Write Operations

| Tool | Phase | Usage |
|------|-------|-------|
| `createJiraIssue` | 2.5, 3.5 | Create Epic, Story, Task, Sub-task issues |
| `createIssueLink` | 2.5, 3.5 | Create blocks, split-into, relates-to links |
| `editJiraIssue` | 2.5 | Update issue fields after creation (if needed) |
| `transitionJiraIssue` | 2.5 | Transition status (horizontal split: original → Done) |
| `addCommentToJiraIssue` | 3.5 | Post B→A feedback comments to Story issues |

---

## Agent Spawn

| Agent | Phase | Model | Purpose | Spawned By |
|-------|-------|-------|---------|------------|
| `imbas-analyst` | 1 | sonnet | 5-type document validation (contradictions, divergences, omissions, infeasibilities, testability) | Phase 1 Step 1.3 |
| `imbas-planner` | 2 | sonnet | INVEST-compliant Story splitting with User Story + AC | Phase 2 Step 2.3 |
| `imbas-analyst` | 2 | sonnet | Reverse-inference verification (reassemble Stories vs original) | Phase 2 Step 2.4[2] |
| `imbas-engineer` | 3 | opus | Codebase exploration, EARS Subtask generation, Task extraction | Phase 3 Step 3.2 |

### Agent Access Control

Agents do NOT have access to pipeline state tools. The pipeline skill handles all state updates:

- Agents produce output (reports, manifests, verification results)
- Pipeline skill interprets output and calls imbas_run_transition / imbas_manifest_save
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
- Manifest execution (Phase 2.5, 3.5) — direct Atlassian MCP tool calls
- Epic/parent decision — deterministic from --parent argument (resolved in Phase 0)
- Gate evaluation — pipeline skill evaluates fields directly
