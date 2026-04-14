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

### Phase 1 — Discovery (`qa-reviewer`)

Locate all `test.ts` files and analyze metrics via `mcp_t_test_metrics(action: "count")`.
See [reference.md Section 1](./reference.md#section-1--discovery-details).

### Phase 2 — Eligibility Check (`qa-reviewer`)

Apply stability threshold (default 90 days) and failure history filter.
If no files pass the eligibility check, report "No eligible test.ts files found (none meet the {N}-day stability threshold)" and exit without proceeding to Phase 3.
See [reference.md Section 2](./reference.md#section-2--eligibility-rules).

### Phase 3 — Pattern Analysis (`qa-reviewer`)

Categorize tests as basic/complex, identify duplicates and parameterizable patterns.
See [reference.md Section 3](./reference.md#section-3--pattern-analysis).

### Phase 4 — Spec Generation (`implementer`)

Delegate to `implementer` agent. Build parameterized `spec.ts` enforcing
the 3+12 rule (≤15 total cases).
See [reference.md Section 4](./reference.md#section-4--spec-generation-312-rule).

### Phase 5 — Validation (`qa-reviewer`)

Verify generated specs pass `mcp_t_test_metrics(action: "check-312")` before writing.

- **PASS**: Proceed to Phase 6.
- **FAIL**: Abort migration for that file; report which cases exceed the 3+12 limit and skip Phase 6 for the failing file.

See [reference.md Section 5](./reference.md#section-5--validation-and-migration).

### Phase 6 — Migration (`implementer`)

Write validated `spec.ts`, remove original `test.ts`, and emit report.
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
