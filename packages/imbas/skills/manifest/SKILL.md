---
name: imbas-manifest
user_invocable: true
description: >
  Execute a stories-manifest or devplan-manifest to batch-create Jira issues.
  Supports dry-run, resume from failure, and selective execution.
  Trigger: "execute manifest", "매니페스트 실행", "jira 생성"
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
/imbas:manifest <type> [--run <run-id>] [--dry-run]

<type>    : "stories" | "devplan"
--run     : Run ID (if omitted, uses most recent eligible run)
--dry-run : Preview execution plan without creating any Jira issues
```

## References

- [Workflow](./workflow.md) — Steps 1–5: load, dry-run, confirm, batch execution, result report
- [Tools](./tools.md) — imbas MCP tools, Atlassian MCP tools, output, agent spawn
- [Error Handling](./errors.md) — Error conditions and recovery actions
- [State Transitions](./state-transitions.md) — Preconditions and manifest item status spec
