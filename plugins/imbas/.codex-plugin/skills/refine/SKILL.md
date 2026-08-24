---
name: refine
user-invocable: true
description: 'Phase 1 of the imbas pipeline: restructures a planning document into the standard sections and validates contradictions, omissions, and testability (refined.md + validation-report.md). Use for "refine spec", "기획서 검증", "문서 재구조화".'
argument-hint: '<source> [--project KEY] [--supplements PATHS]'
version: '2.0.0'
complexity: moderate
plugin: imbas
---

> **EXECUTION MODEL**: Execute all workflow steps as a SINGLE CONTINUOUS OPERATION. After each step completes, IMMEDIATELY proceed to the next in the SAME TURN. NEVER yield after MCP tool calls, subagent (`analyst`) returns, or [OP: get_confluence] / [OP: search_confluence] operations.
>
> **Valid reasons to yield**:
>
> 1. User decision genuinely required
> 2. Terminal stage marker emitted: `Refine result: (PASS|PASS_WITH_WARNINGS|BLOCKED)`
>
> **HIGH-RISK YIELD POINTS**:
>
> - After `analyst` subagent returns `refined.md` + `validation-report.md` content — chain `mcp__plugin_imbas_tools__run_transition(complete_phase)` in the same turn
> - After Confluence page fetch — continue to markdown conversion without pause
> - After gate evaluation (BLOCKED → STOP) — emit blocker report AND end execution in the same turn

# refine — Phase 1 Document Restructuring & Validation

Restructures a planning document into the standard section layout and validates it for internal consistency. The refined document is the canonical input for Phase 2 (estimate) and Phase 3 (split); the validation result gates pipeline entry.

## When to Use This Skill

- Starting a new imbas pipeline run with a planning document
- Re-refining a document after corrections
- Normalizing a free-form document or Confluence page before estimation or splitting

## Arguments

```
/imbas:refine <source> [--project <KEY>] [--supplements <path,...>]

<source>       : Planning document path (local md/txt) or Confluence URL
--project      : Project key (overrides config.defaults.project_ref)
--supplements  : Supplementary material paths (comma-separated)
```

## Outputs

- `refined.md` — the document restructured into the standard sections (Background / Goals / Scope / User flows / Feature specs / Policies / Acceptance criteria / Non-goals). Produced when the result is PASS or PASS_WITH_WARNINGS. The original `source.md` is never modified.
- `validation-report.md` — the 5-type validation findings, each classified BLOCKING or WARNING.

## References

- [Workflow](./references/workflow.md) — Steps 1–5: run initialization, source resolution, agent spawn, result gate, state update
- [Tools Used & Agent Spawn](./references/tools.md) — imbas MCP tools, [OP:] operations, agent spawn instructions
- [Error Handling](./references/errors.md) — error table
- [State Transitions & Output](./references/state-transitions.md) — output paths, entry/exit states
