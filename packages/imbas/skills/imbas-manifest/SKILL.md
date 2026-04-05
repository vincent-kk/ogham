---
name: imbas-manifest
user_invocable: true
description: "[imbas:imbas-manifest] Execute a stories-manifest or devplan-manifest to batch-create Jira issues. Supports dry-run, resume from failure, and selective execution. Trigger: \"execute manifest\", \"매니페스트 실행\", \"jira 생성\""
version: "1.0.0"
complexity: moderate
plugin: imbas
---

# imbas-manifest — Manifest Execution (Jira Batch Creation)

Executes a stories-manifest or devplan-manifest to batch-create Jira issues,
links, and comments. Supports dry-run preview, crash recovery via per-item save,
and idempotent re-execution.

## When to Use This Skill

- After Phase 2 (split) to create Stories in Jira
- After Phase 3 (devplan) to create Tasks, Subtasks, links, and feedback comments
- To resume a partially failed batch execution
- To preview what will be created (dry-run)

## Arguments

```
/imbas:imbas-manifest <type> [--run <run-id>] [--dry-run]

<type>    : "stories" | "devplan"
--run     : Run ID (if omitted, uses most recent eligible run)
--dry-run : Preview execution plan without creating any Jira issues
```

## References

- [Workflow](./references/workflow.md) — Steps 1–5: load, dry-run, confirm, batch execution, result report
- [Tools](./references/tools.md) — imbas MCP tools, output, agent spawn
- [Error Handling](./references/errors.md) — Error conditions and recovery actions
- [State Transitions](./references/state-transitions.md) — Preconditions and manifest item status spec

<!-- imbas:constraints-v1 -->
## Workflow (Provider-agnostic skeleton)

1. Load inputs (manifest, run state) via imbas_tools.
2. Read `config.provider` via `config_get`.
3. Load ONLY the provider-specific workflow file matching `config.provider`:

   | provider | workflow file |
   |---|---|
   | `jira`   | `references/jira/workflow.md` |
   | `github` | `references/github/workflow.md` |
   | `local`  | `references/local/workflow.md` |

4. Execute those steps exactly.
5. Persist outputs via imbas_tools (`manifest_save`, `run_transition`, etc.).

## Constraints

- When running as provider X, MUST NOT read any file under `references/Y/**` for any other Y.
- Provider-specific tools (atlassian__* for jira, `gh issue *` / `gh label *` / `gh api` via Bash for github, Read/Write/Edit for local) MUST only be invoked from within the matching `references/<provider>/` workflow.
