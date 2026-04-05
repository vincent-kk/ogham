---
name: imbas-validate
user_invocable: true
description: "[imbas:imbas-validate] Phase 1 of the imbas pipeline. Validates a planning document for contradictions, divergences, omissions, and logical infeasibilities. Produces a markdown validation report. Trigger: \"validate spec\", \"check document\", \"정합성 검증\", \"문서 검증\""
version: "1.0.0"
complexity: moderate
plugin: imbas
---

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
