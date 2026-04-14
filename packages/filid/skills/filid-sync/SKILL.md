---
name: filid-sync
user_invocable: true
description: "[filid:filid-sync] Detect deviations between the current project structure and fractal principles, then apply targeted corrections with severity filtering, dry-run preview, and auto-approve support for CI pipelines."
argument-hint: "[path] [--severity critical|high|medium|low] [--dry-run] [--auto-approve]"
version: "1.0.0"
complexity: complex
plugin: filid
---

> **EXECUTION MODEL (Tier-2b interactive-aware)**: Execute all stages as a
> SINGLE CONTINUOUS OPERATION EXCEPT at Stage 3 (Plan & Approval) when
> `--auto-approve` is absent. At that EXACT step, `AskUserQuestion` yield
> is REQUIRED. At all other stages, NEVER yield.
>
> **Under `--auto-approve` mode**: Stage 3 approval is skipped; EXECUTION
> MODEL applies to every stage without exception.
>
> **Valid reasons to yield**:
> 1. Stage 3 interactive approval active (no `--auto-approve`)
> 2. Terminal stage marker emitted: `Sync complete: N corrections applied` or `Sync dry-run complete`
>
> **HIGH-RISK YIELD POINTS**:
> - After Stage 1 `drift-analyzer` returns scan results — immediately chain Stage 2 classification
> - After Stage 2 severity classification — chain Stage 3 plan generation or `--auto-approve` execution in the same turn
> - Stage 4 `restructurer` execution — do NOT pause between corrections; continue until batch complete
> - `--dry-run` preview — emit preview AND end in the same turn

# filid-sync — Structural Drift Synchronization

Detect deviations between the current project structure and fractal principles,
then apply targeted corrections. `drift-analyzer` scans and classifies drift items,
`fractal-architect` reviews the correction plan, and `restructurer` executes the
approved corrections.

> **Detail Reference**: For detailed workflow steps, MCP tool call examples,
> and output format templates, read the `reference.md` file in this
> skill's directory (same location as this SKILL.md).

## When to Use This Skill

- Correcting minor structural drift after a development session
- Automatically detecting and fixing drift in a CI pipeline
- Selectively correcting only `critical` or `high` severity drift items
- Applying small corrections without the full scope of `/filid:filid-restructure`
- Inspecting drift status without making changes (`--dry-run`)

### Integration with update

When invoked via `/filid:filid-update`, this skill runs as Stage 2 only when `critical` or `high`
severity violations are detected in Stage 1. Standalone execution (`/filid:filid-sync`) always
operates independently.

## Core Workflow

### Stage 1 — Scan

`drift-analyzer` scans the full project using `mcp_t_fractal_scan` to establish the
current structural state.
See [reference.md Section 1](./reference.md#section-1--scan).

### Stage 2 — Detect & Classify

`mcp_t_drift_detect` identifies all drift items and classifies them by severity:
`critical`, `high`, `medium`, `low`. The `--severity` option restricts which
items are included in the correction plan.
See [reference.md Section 2](./reference.md#section-2--detect--classify).

### Stage 3 — Plan & Approval

`drift-analyzer` generates the correction plan. `fractal-architect` reviews
reclassification candidates using `mcp_t_lca_resolve`. The plan is presented to the
user for approval unless `--auto-approve` is set.
See [reference.md Section 3](./reference.md#section-3--plan--approval).

### Stage 4 — Correction Execution

Skipped when `--dry-run` is set — the plan from Stage 3 is printed and the skill exits without modifying any files.

Otherwise, `restructurer` executes the approved corrections and `mcp_t_structure_validate` confirms
the result.
See [reference.md Section 4](./reference.md#section-4--correction-execution).

## Available MCP Tools

| Tool                 | Stage | Purpose                                                     |
| -------------------- | ----- | ----------------------------------------------------------- |
| `mcp_t_fractal_scan`       | 1     | Full project structure scan                                 |
| `mcp_t_drift_detect`       | 2     | Identify drift items                                        |
| `mcp_t_lca_resolve`        | 3     | Determine correct placement for reclassification candidates |
| `mcp_t_structure_validate` | 4     | Validate post-correction structure                          |

## Options

> Options are LLM-interpreted hints, not strict CLI flags. Natural language works equally well (e.g., "critical만 처리해줘" instead of `--severity critical`).

```
/filid:filid-sync [path] [--severity critical|high|medium|low] [--dry-run] [--auto-approve]
```

| Option           | Type                          | Default                   | Description                                               |
| ---------------- | ----------------------------- | ------------------------- | --------------------------------------------------------- |
| `path`           | string                        | Current working directory | Root directory to scan                                    |
| `--severity`     | `critical\|high\|medium\|low` | `low` (all)               | Minimum severity level to correct                         |
| `--dry-run`      | flag                          | off                       | Print detection results and plan without applying changes |
| `--auto-approve` | flag                          | off                       | Skip user approval step                                   |

## Quick Reference

```bash
# Detect and correct all drift
/filid:filid-sync

# Correct critical and high severity only
/filid:filid-sync --severity high

# Inspect drift without making changes
/filid:filid-sync --dry-run

# CI automated correction (critical only)
/filid:filid-sync --severity critical --auto-approve

Stages:   Scan → Detect → Plan → Execute
Agents:   drift-analyzer (Stage 1, 2, 3), fractal-architect (Stage 3 review), restructurer (Stage 4)
Severity: critical > high > medium > low
```

Key rules:

- `--severity high` corrects `critical` and `high` items; `medium` and `low` are reported but skipped
- `--dry-run` never modifies files
- If critical drift is present, correct it before re-running builds or tests
- `--auto-approve` is recommended only in validated CI environments
