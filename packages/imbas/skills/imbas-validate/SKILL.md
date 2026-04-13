---
name: imbas-validate
user_invocable: true
description: "[imbas:imbas-validate] Phase 1 of the imbas pipeline. Validates a planning document for contradictions, divergences, omissions, and logical infeasibilities. Produces a markdown validation report. Trigger: \"validate spec\", \"check document\", \"정합성 검증\", \"문서 검증\""
argument-hint: "<source> [--project KEY] [--supplements PATHS]"
version: "1.0.0"
complexity: moderate
plugin: imbas
---

> **EXECUTION MODEL**: Execute all workflow steps as a SINGLE CONTINUOUS OPERATION.
> After each step completes, IMMEDIATELY proceed to the next in the SAME TURN.
> NEVER yield after MCP tool calls, subagent (`analyst`) returns, or
> [OP: get_confluence] / [OP: search_confluence] operations.
>
> **Valid reasons to yield**:
> 1. User decision genuinely required
> 2. Terminal stage marker emitted: `Validation result: (PASS|PASS_WITH_WARNINGS|BLOCKED)`
>
> **HIGH-RISK YIELD POINTS**:
> - After `analyst` subagent returns `validation-report.md` content — chain `run_transition(complete_phase)` in the same turn
> - After Confluence page fetch — continue to markdown conversion without pause
> - After gate evaluation (BLOCKED → STOP) — emit blocker report AND end execution in the same turn

# imbas-validate — Phase 1 Document Validation

Validates a planning document for internal consistency, producing a structured
validation report that gates entry to Phase 2 (split).

## When to Use This Skill

- Starting a new imbas pipeline run with a planning document
- Re-validating a document after corrections
- Checking a Confluence page for consistency before story splitting

## Arguments

```
/imbas:imbas-validate <source> [--project <KEY>] [--supplements <path,...>]

<source>       : Planning document path (local md/txt) or Confluence URL
--project      : Jira project key (overrides config.defaults.project_ref)
--supplements  : Supplementary material paths (comma-separated)
```

## References

- [Workflow](./references/workflow.md) — Steps 1–5: run initialization, source resolution, agent spawn, result gate, state update
- [Tools Used & Agent Spawn](./references/tools.md) — imbas MCP tools, Atlassian tools, agent spawn instructions
- [Error Handling](./references/errors.md) — error table
- [State Transitions & Output](./references/state-transitions.md) — output path, entry/exit states
