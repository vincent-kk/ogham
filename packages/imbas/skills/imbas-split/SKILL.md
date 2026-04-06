---
name: imbas-split
user_invocable: true
description: "[imbas:imbas-split] Phase 2 of the imbas pipeline. Splits a validated document into INVEST-compliant Jira Stories. Applies 3→1→2 verification, size checks, and horizontal splitting. Trigger: \"split stories\", \"story 분할\", \"Phase 2\", \"imbas split\""
version: "1.0.0"
complexity: complex
plugin: imbas
---

# imbas-split — Phase 2 Story Splitting

Splits a validated planning document into INVEST-compliant Jira Stories with
3→1→2 verification, size checks, and horizontal splitting when needed.

## When to Use This Skill

- After Phase 1 (validate) completes with PASS or PASS_WITH_WARNINGS
- To re-split stories after user feedback on a previous split
- To continue a split that was escaped (E2-3 allows direct Phase 3 entry)

## Arguments

```
/imbas:imbas-split [--run <run-id>] [--epic <EPIC-KEY>]

--run    : Existing run ID (if omitted, uses most recent PASS/PASS_WITH_WARNINGS run)
--epic   : Epic Jira key (if omitted, prompts for Epic creation or selection)
```

## References

- [Preconditions](./references/preconditions.md) — state.json requirements before running
- [Workflow](./references/workflow.md) — Steps 1–7 (Epic decision, agent spawn, verification, manifest, review)
- [Escape Conditions](./references/escape-conditions.md) — E2-1, E2-2, E2-3, EC-1, EC-2 escape logic
- [Tools Used](./references/tools.md) — imbas MCP tools, Jira operations ([OP:]), agent spawn instructions
- [Error Handling](./references/errors.md) — error table
- [State Transitions & Output](./references/state-transitions.md) — entry/exit states and output artifact
