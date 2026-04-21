---
name: filid-promote
user_invocable: false
description: "[filid:filid-promote] Promote stable test.ts files (unchanged for at least `--days=N` days, default 90) into parameterized spec.ts files satisfying the FCA-AI 3+12 rule of maximum 15 test cases."
argument-hint: "[path] [--days=N]"
version: "1.0.0"
complexity: medium
plugin: filid
---

> **EXECUTION MODEL**: Execute all phases as a SINGLE CONTINUOUS OPERATION.
> After each phase completes, IMMEDIATELY proceed to the next in the SAME TURN.
> NEVER yield after `qa-reviewer` returns, `implementer` agent completion, or
> `mcp_t_test_metrics` MCP results.
>
> **Valid reasons to yield**:
> 1. User decision genuinely required
> 2. Terminal stage marker emitted: `Promotion complete: N files promoted` or `No eligible test.ts files found`
>
> **HIGH-RISK YIELD POINTS**:
> - Phase 2 eligibility early-exit — emit "no eligible files" message AND end in the same turn
> - After Phase 3 pattern analysis — immediately chain Phase 4 `implementer` delegation
> - Phase 4 `implementer` returns spec.ts — chain Phase 5 validation without pause
> - Phase 6 migration (test.ts → spec.ts rename) — complete the migration AND emit final report in the same turn

# filid-promote — Test Promotion

Promote stable `test.ts` files to parameterized `spec.ts` files satisfying the
FCA-AI 3+12 rule (max 3 basic + 12 complex = 15 total). Executes discovery,
eligibility, analysis, generation, validation, and migration in one pass.

> **Detail Reference**: For detailed workflow steps, MCP tool examples,
> and output format templates, read the `reference.md` file in this
> skill's directory (same location as this SKILL.md).

## When to Use This Skill

- When `test.ts` files have been stable for 90+ days with no recent failures
- Before a release to consolidate ad-hoc tests into structured specs
- After a feature stabilizes and its test patterns become predictable
- When duplicate test cases can be consolidated via parameterization
- To bring a module into full FCA-AI compliance

## Core Workflow

> **Capability Model**: Per the policy in `filid-restructure/SKILL.md` Stage
> 4, orchestrating skills own all MCP and Bash invocations; agents only
> interpret the results. `qa-reviewer` has `Read, Glob, Grep` tool access
> only (no MCP, no Bash). `implementer` has `Read, Write, Edit, Glob, Grep,
> Bash` (no MCP). Every phase below attributes MCP/Bash calls to the skill
> and analytical judgment to the named agent.

### Phase 1 — Discovery (skill → `qa-reviewer`)

The **skill** calls `Glob("**/test.ts", root: <targetPath or cwd>)` for file
discovery, then invokes `mcp_t_test_metrics(action: "count", files: [...])`
for each match. The aggregated metrics (per-file `basic`, `complex`,
`total`, `stableDays`, `lastFailure`) are passed to a `filid:qa-reviewer`
Task, which surfaces the candidate list.
See [reference.md Section 1](./reference.md#section-1--discovery-details).

### Phase 2 — Eligibility Check (skill → `qa-reviewer`)

The **skill** runs `git log -1 --format=%ct <file>` (Bash) per file to
compute file age and reads any project-local failure history via `Read`.
The aggregated `{ file, stableDays, lastFailure }` tuples are passed to a
`filid:qa-reviewer` Task, which classifies eligibility against the
`--days` threshold (default 90) and returns the eligible / ineligible
partition with reasons.

If the partition reports zero eligible files, the skill reports
"No eligible test.ts files found (none meet the {N}-day stability threshold)"
and exits without proceeding to Phase 3.
See [reference.md Section 2](./reference.md#section-2--eligibility-rules).

### Phase 3 — Pattern Analysis (skill → `qa-reviewer`)

The **skill** reads each eligible test file via `Read`. The file contents
are passed to a `filid:qa-reviewer` Task that categorizes tests as
basic/complex, identifies duplicates, and flags parameterizable patterns.
No MCP or Bash calls are required for this phase.
See [reference.md Section 3](./reference.md#section-3--pattern-analysis).

### Phase 4 — Spec Generation (`implementer`)

The skill delegates to a `filid:implementer` Task. The `implementer` has
the Write access required to author new `spec.ts` files; it builds a
parameterized spec enforcing the 3+12 rule (≤15 total cases) using the
pattern analysis from Phase 3 as task input.
See [reference.md Section 4](./reference.md#section-4--spec-generation-312-rule).

### Phase 5 — Validation (skill → `qa-reviewer`)

The **skill** calls `mcp_t_test_metrics(action: "check-312", files: [...])`
for each generated spec. The PASS/FAIL results are passed to a
`filid:qa-reviewer` Task that interprets the outcome per file:

- **PASS**: Proceed to Phase 6 for that file.
- **FAIL**: Abort migration for that file; report which cases exceed the
  3+12 limit and skip Phase 6 for the failing file only.

See [reference.md Section 5](./reference.md#section-5--validation-and-migration).

### Phase 6 — Migration (`implementer`)

The skill delegates to a `filid:implementer` Task. The `implementer`
writes the validated `spec.ts`, removes the original `test.ts` (Bash `rm`
via its Bash tool), and emits the migration report.
See [reference.md Section 5 — Migration subsection](./reference.md#section-5--validation-and-migration).

## Available MCP Tools

| Tool           | Action      | Purpose                                                  |
| -------------- | ----------- | -------------------------------------------------------- |
| `mcp_t_test_metrics` | `count`     | Analyze test case counts, stability, and failure history |
| `mcp_t_test_metrics` | `check-312` | Validate generated spec.ts against 3+12 rule             |

## Options

> Options are LLM-interpreted hints, not strict CLI flags. Natural language works equally well (e.g., "60일 기준으로 해줘" instead of `--days=60`).

```
/filid:filid-promote [path] [--days=90]
```

| Option     | Type    | Default                   | Description                                  |
| ---------- | ------- | ------------------------- | -------------------------------------------- |
| `path`     | string  | current working directory | Target directory to scan for `test.ts` files |
| `--days=N` | integer | 90                        | Minimum stability period in days             |

## Quick Reference

> **Internal skill** (`user_invocable: false`) — invoked by orchestrator
> skills (`filid:filid-resolve` Step 4b when a fix item has `type:
> filid-promote`). Not intended for direct user invocation via
> `/filid:filid-promote`. The examples below document orchestrator-level
> argument shapes.

```
/filid:filid-promote                         # Scan cwd, 90-day threshold
/filid:filid-promote [path]                  # Scan specific directory
/filid:filid-promote --days=N                # Custom stability threshold
/filid:filid-promote [path] --days=N         # Both options combined

Phases:   Discovery → Eligibility → Analysis → Generation → Validate → Migrate
Agents:   qa-reviewer (analysis), implementer (execution)
Constants:
  DEFAULT_STABILITY_DAYS = 90
  TEST_THRESHOLD         = 15  (max cases per spec.ts)
  basic  <= 3
  complex <= 12
Rule:   Write spec.ts only after check-312 passes; delete test.ts after write succeeds
```
