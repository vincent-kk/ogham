---
name: imbas-devplan
user_invocable: true
description: "[imbas:imbas-devplan] Phase 3 of the imbas pipeline. Generates EARS-format Subtasks and extracts cross-Story Tasks by exploring the local codebase. Operates on approved Stories or E2-3 escaped splits (single-Story documents that bypass decomposition). Trigger: \"create devplan\", \"dev plan\", \"Phase 3\", \"subtask creation\"."
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
/imbas:imbas-devplan [--run <run-id>] [--stories <S1,S2,...>]

--run      : Run ID (if omitted, uses most recent eligible run)
--stories  : Target Story IDs (comma-separated; if omitted, processes all Stories)
```

## References

- [preconditions.md](./references/preconditions.md) — state.json and stories-manifest preconditions
- [workflow.md](./references/workflow.md) — Steps 1, 2, 4 (agnostic); Step 3 feedback and Step 4 final message are provider-specific
- [ast-fallback.md](./references/ast-fallback.md) — AST fallback logic is handled internally by imbas-engineer agent
- [tools.md](./references/tools.md) — Shared imbas MCP tools and agent spawn instructions
- [errors.md](./references/errors.md) — Provider-agnostic error conditions
- [state-transitions.md](./references/state-transitions.md) — output location and state transition diagram

<!-- imbas:constraints-v1 -->
## Workflow (Provider-agnostic skeleton)

1. Load stories-manifest and run state via imbas_tools.
2. Read `config.provider` via `config_get`.
3. Load ONLY the provider-specific workflow file matching `config.provider` for Step 3 (feedback target_ref semantics) and Step 4 final message:

   | provider | workflow file |
   |---|---|
   | `jira`   | `references/jira/workflow.md` |
   | `github` | `references/github/workflow.md` |
   | `local`  | `references/local/workflow.md` |

4. Execute Steps 1, 2 (imbas-engineer agent spawn), and 4 from the shared skeleton; use the provider file for Step 3 target_ref semantics and the Step 4 completion message.
5. Persist devplan-manifest.json via manifest_save.

## Constraints

- When running as provider X, MUST NOT read any file under `references/Y/**` for any other Y.
- Provider-specific tools (atlassian__* for jira, `gh issue view/list` via Bash for github, Read/Grep/Glob for local) MUST only be invoked from within the matching `references/<provider>/` workflow. The imbas-engineer agent's core exploration tools (ast_search, ast_analyze, Read, Grep, Glob) are shared and provider-agnostic.
