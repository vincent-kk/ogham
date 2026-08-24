---
name: split
user-invocable: true
description: 'Phase 3 of the imbas pipeline: splits a refined document into INVEST-compliant issues and, after an approval gate, batch-creates them on Jira, GitHub, or local with dry-run and resume support. Use for "이슈 쪼개기", "split stories", "issue 생성".'
argument-hint: '[--run RUN_ID] [--epic EPIC-KEY] [--dry-run]'
version: '2.0.0'
complexity: complex
plugin: imbas
---

> **EXECUTION MODEL**: Execute all workflow steps as a SINGLE CONTINUOUS OPERATION. After each step completes, IMMEDIATELY proceed to the next in the SAME TURN. NEVER yield after MCP tool calls, subagent returns, the 3→1→2 verification loop, or provider creation operations.
>
> **Valid reasons to yield**:
>
> 1. User decision genuinely required — the estimate-skip question (Step 1), the Epic decision (Step 2), and the approval gate (Step 8) are the sanctioned decision points
> 2. Terminal stage marker emitted: `Split complete`, `Split partial failure`, or `Escape code: E[0-9C]-[0-9]`
>
> **HIGH-RISK YIELD POINTS**:
>
> - After `planner` subagent returns the issue list — immediately proceed to 3→1→2 verification
> - Reverse-inference `analyst` subagent return — chain gate evaluation in the same turn
> - Horizontal split recursion (Step 5(a)) — recursive re-verification MUST NOT yield between iterations
> - **After the user approves at Step 8 — creation (Steps 9–11) starts in the SAME turn**
> - Provider creation loops — after EACH item, save the manifest via `mcp__plugin_imbas_tools__manifest_save` and chain the next item; never pause to report partial progress
> - Escape condition detection — emit blocker report AND end execution in the same turn

# split — Phase 3 Issue Splitting & Creation

Splits a refined planning document into INVEST-compliant issues with 3→1→2 verification, size checks, and horizontal splitting — then, after the user approves the stories manifest, batch-creates the issues on the configured provider in the same flow. Creation is idempotent and resumable: each item records `issue_ref`/`status` immediately, so a re-run only retries what is missing.

## When to Use This Skill

- After Phase 1 (refine) — and optionally Phase 2 (estimate) — to turn the refined document into tracked issues
- To re-split after user feedback on a previous decomposition
- To resume a partially failed creation batch (`--run` the same run again)
- To preview creation without writing to the provider (`--dry-run`)

## Arguments

```
/imbas:split [--run <run-id>] [--epic <EPIC-KEY>] [--dry-run]

--run     : Existing run ID (if omitted, uses the most recent eligible run)
--epic    : Epic key (if omitted, prompts for Epic creation or selection; jira/github only)
--dry-run : Stop at the execution preview — decompose and save the manifest, create nothing
```

## Estimation Linkage

If `estimation.json` exists in the run, `planner` receives it as context and each Story carries `estimate_manday` (the mapped unit's expected man-days; `null` when no unit maps). The value is appended to the issue description on creation.

## References

Decomposition:

- [Preconditions](./references/preconditions.md) — state.json requirements, estimate-skip flow
- [Workflow](./references/workflow.md) — Steps 1–7: run load, Epic decision, planner spawn, 3→1→2 verification, size check, manifest save
- [Escape Conditions](./references/escape-conditions.md) — E2-1, E2-2, E2-3, EC-1, EC-2 escape logic

Creation:

- [Creation Workflow](./references/creation-workflow.md) — Steps 8–11: approval gate, drift check, provider batch execution, result report
- [Label Transitions](./references/label-transitions.md) — lifecycle label apply/remove rules

Shared:

- [Tools Used](./references/tools.md) — imbas MCP tools, agent spawns
- [Error Handling](./references/errors.md) — error table
- [State Transitions & Output](./references/state-transitions.md) — entry/exit states and output artifacts

<!-- imbas:constraints-v1 -->

## Creation (Provider-agnostic skeleton)

1. Load inputs (stories manifest via Read, run state via imbas_tools).
2. Read `config.provider` via `mcp__plugin_imbas_tools__config_get`.
3. Load ONLY the provider-specific workflow file matching `config.provider`:

   | provider | workflow file                   |
   | -------- | ------------------------------- |
   | `jira`   | `references/jira/workflow.md`   |
   | `github` | `references/github/workflow.md` |
   | `local`  | `references/local/workflow.md`  |

4. Execute those steps exactly.
5. Persist outputs via imbas_tools (`mcp__plugin_imbas_tools__manifest_save`, `mcp__plugin_imbas_tools__run_transition`, etc.).

## Constraints

- When running as provider X, MUST NOT read any file under `references/Y/**` for any other Y.
- Provider-specific operations (`[OP:]` notation for jira, gh CLI via Bash for github, Read/Write/Edit for local) MUST only be invoked from within the matching `references/<provider>/` workflow.
