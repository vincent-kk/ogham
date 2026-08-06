---
name: estimate
user-invocable: true
description: '[imbas:estimate] Phase 2 (optional) of the imbas pipeline. Decomposes a refined planning document through three views (page/feature/module), reconciles them into a single WBS, applies PERT per unit, and lays out a schedule. Produces estimation.json + estimation-report.md. Trigger: "estimate manday", "견적", "공수 산정", "일정 산출", "manday 추산"'
argument-hint: '[--run RUN_ID] [--team-size N] [--buffer RATIO]'
version: '1.0.0'
complexity: complex
plugin: imbas
---

> **EXECUTION MODEL**: Execute all workflow steps as a SINGLE CONTINUOUS OPERATION. After each step completes, IMMEDIATELY proceed to the next in the SAME TURN. NEVER yield after MCP tool calls or the `estimator` subagent return.
>
> **Valid reasons to yield**:
>
> 1. User decision genuinely required
> 2. Terminal stage marker emitted: `Estimation complete: <N> man-days` or an error stop
>
> **HIGH-RISK YIELD POINTS**:
>
> - After `estimator` subagent returns the estimation payload — chain `mcp__plugin_imbas_tools__manifest_save(type: "estimation")`, the report render, and `mcp__plugin_imbas_tools__run_transition(complete_phase)` in the same turn

# estimate — Phase 2 Man-Day Estimation & Schedule

Answers "how long will this take" from the refined planning document alone. Decomposes the product through three views, reconciles them into a single WBS, applies PERT per unit, and lays the units onto a team-sized schedule. Estimation is context-heavy by design — the whole analysis runs inside the `estimator` subagent so the main session only consumes the result.

The estimate never reads the codebase: inputs are `refined.md` and `config.estimation` coefficients, and every gap is recorded as an explicit assumption.

## When to Use This Skill

- After Phase 1 (refine) passes, before splitting into issues
- To answer "얼마나 걸려요?" for a planning document with a defensible, reproducible figure
- To re-estimate after the document or the team coefficients changed

This phase is OPTIONAL — /imbas:split offers to skip it (`run_transition skip_phases`).

## Arguments

```
/imbas:estimate [--run <run-id>] [--team-size <N>] [--buffer <ratio>]

--run       : Existing run ID (if omitted, uses the most recent run whose refine passed)
--team-size : Override config.estimation.team_size for this run
--buffer    : Override config.estimation.buffer_ratio for this run
```

## Outputs

- `estimation.json` — schema-validated estimation manifest (units, rollup, schedule, assumptions, risks)
- `estimation-report.md` — human-readable report: summary, WBS table, mermaid gantt, assumptions, top risks, single-view confirmations

## References

- [Method](./references/method.md) — 3-view decomposition, reconciliation rules, complexity grading, PERT formulas, schedule layout
- [Workflow](./references/workflow.md) — Steps 1–5: run load, estimator spawn, manifest save, report render, state update
- [Output Schema](./references/output-schema.md) — estimation.json field-by-field contract
- [Error Handling](./references/errors.md) — error table
