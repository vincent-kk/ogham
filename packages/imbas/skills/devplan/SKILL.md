---
name: imbas-devplan
user_invocable: true
description: >
  Phase 3 of the imbas pipeline. Generates EARS-format Subtasks and extracts
  cross-Story Tasks by exploring the local codebase. Operates on approved Stories only.
  Trigger: "create devplan", "dev 계획", "Phase 3", "subtask 생성"
version: "1.0.0"
complexity: complex
plugin: imbas
---

# imbas-devplan — Phase 3 Development Plan Generation

Generates EARS-format Subtasks per Story and extracts cross-Story Tasks
by exploring the local codebase. Produces a devplan-manifest.json for
batch Jira issue creation.

## When to Use This Skill

- After Phase 2 (split) is completed and reviewed
- After stories-manifest has been executed (Stories exist in Jira)
- To regenerate devplan for specific Stories after changes

## Arguments

```
/imbas:devplan [--run <run-id>] [--stories <S1,S2,...>]

--run      : Run ID (if omitted, uses most recent eligible run)
--stories  : Target Story IDs (comma-separated; if omitted, processes all Stories)
```

## References

- [preconditions.md](./preconditions.md) — state.json and stories-manifest preconditions
- [workflow.md](./workflow.md) — Steps 1–4: load, agent spawn, feedback, user review
- [ast-fallback.md](./ast-fallback.md) — AST fallback detection and LLM substitution rules
- [tools.md](./tools.md) — imbas and Atlassian MCP tools, agent spawn instructions
- [errors.md](./errors.md) — error conditions and responses
- [state-transitions.md](./state-transitions.md) — output location and state transition diagram
