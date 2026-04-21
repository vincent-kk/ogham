---
name: imbas-implement-plan
user_invocable: true
description: "[imbas:imbas-implement-plan] Build a DAG-based implementation schedule from Stories and cross-story Tasks. Groups tickets into parallel batches with execution order like [1,2,5] -> [3] -> [4,6,7]. Runs after devplan (Phase 3) or manifest-devplan (Phase 3.5). Trigger: \"implement plan\", \"배치 계획\", \"implementation schedule\", \"병렬 스토리 그룹화\"."
argument-hint: "[--run RUN_ID] [--source stories|devplan] [--max-parallel N]"
version: "1.0.0"
complexity: moderate
plugin: imbas
---

> **EXECUTION MODEL**: Execute all workflow steps as a SINGLE CONTINUOUS OPERATION.
> After each step completes, IMMEDIATELY proceed to the next in the SAME TURN.
> NEVER yield after MCP tool calls or manifest save.
>
> **Valid reasons to yield**:
> 1. User decision genuinely required (e.g., unresolved cycle needs manual input)
> 2. Terminal stage marker emitted: `Implement plan generated` or `Implement plan BLOCKED`

# imbas-implement-plan — DAG-based Implementation Schedule

Computes a parallel+ordered execution schedule from a completed stories-manifest
(optionally joined with devplan-manifest for cross-story Task dependencies).
Produces `implement-plan.json` and a human-readable `implement-plan-report.md`.

## When to Use This Skill

- After Phase 3 (devplan) is completed and approved — recommended
- After Phase 3.5 (manifest-devplan) when every Story/Task has a resolved issue_ref
- To regenerate the schedule after link or block changes

## Arguments

```
/imbas:imbas-implement-plan [--run <run-id>] [--source stories|devplan] [--max-parallel <N>]

--run          : Run ID (if omitted, uses most recent run)
--source       : Dependency source. Default: devplan (uses StoryLink + Task.blocks)
                 stories mode is degraded precision (StoryLink only)
--max-parallel : Soft upper bound on items per group; extra items chunked into
                 multiple groups at the same level
```

## References

- [preconditions.md](./references/preconditions.md) — required manifest states
- [workflow.md](./references/workflow.md) — steps and MCP tool usage
- [schema.md](./references/schema.md) — ImplementPlanManifest structure
- [state-transitions.md](./references/state-transitions.md) — emitted state markers
- [errors.md](./references/errors.md) — error conditions and recovery

## Workflow (Provider-agnostic)

1. Resolve `run_id` via `mcp_tools_run_get` (omit for latest).
2. Call `mcp_tools_manifest_implement_plan` with `{project_ref, run_id, source, max_parallel}`.
2a. If the call fails on a precondition (`E-IP-3` missing/wrong source manifest,
   `E-IP-4` schema validation, `E-IP-5` invalid `--max-parallel`), emit terminal
   marker `Implement plan BLOCKED: <error_code> — <reason>` (see references/errors.md)
   and end. Do NOT continue.
3. On success, read the summary (`total_groups`, `total_items`, `max_level`, `cycles_broken`).
4. If `cycles_broken.length > 0` or `unresolved.length > 0`, surface them in the
   completion message; do NOT pause — the plan is still saved.
5. Emit terminal marker `Implement plan generated` with the report path.

## Constraints

- MUST NOT regenerate stories or devplan manifests.
- MUST NOT create Jira/GitHub issues.
- Pure planning tool: all outputs land in the run directory only.
