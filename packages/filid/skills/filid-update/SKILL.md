---
name: filid-update
user_invocable: false
description: "[filid:filid-update] Analyze branch-changed files to update INTENT.md and DETAIL.md documentation and organize test.ts and spec.ts following FCA-AI principles, with an incremental cache gate to skip unchanged runs."
version: "1.0.0"
complexity: complex
plugin: filid
---

# filid-update — Code-Docs-Tests Synchronization

Analyze files changed in the current branch to:

1. Update INTENT.md / DETAIL.md to match the implementation (create if missing)
2. Organize and update test.ts / spec.ts following FCA-AI principles

An incremental gate (Stage 0) skips execution when no changes have occurred since the last run.

> **Detail Reference**: See `reference.md` for MCP tool call signatures, output formats, and the severity mapping table.

## When to Use This Skill

- Immediately after writing or modifying code, to sync docs and tests
- Before merging a branch, to verify FCA-AI compliance
- When INTENT.md/DETAIL.md are out of sync with the implementation
- When test.ts/spec.ts violate the FCA-AI 3+12 rule

## Core Workflow

### Stage 0 — Change Detection (Incremental Gate)

Without `--force`, exits immediately if no changes have occurred since the last run.

1. `cache_manage({ action: "compute-hash", cwd: "<path>" })` → `currentHash`
2. `cache_manage({ action: "get-hash", cwd: "<path>", skillName: "update" })` → `lastHash`
3. `currentHash === lastHash` and no `--force` → output "No changes since last run. Use --force to override." and exit
4. Changes detected → proceed to Stage 1

See [reference.md Section 0](./reference.md#section-0--change-detection).

### Stage 1 — Scan (Branch Diff-Based)

Scan only files changed in this branch for FCA-AI rule violations.

Agent: `qa-reviewer` (sonnet)
See [reference.md Section 1](./reference.md#section-1--scan).

### Stage 2 — Sync (Conditional Structure Correction)

Runs only when Stage 1 detects `critical` or `high` severity violations.
See `reference.md` Section 2 Severity Normalization Table for the mapping from scan violation types to drift severity levels.

Agents: `drift-analyzer` (sonnet) → `restructurer` (sonnet)
MCP: `drift_detect`, `lca_resolve`, `structure_validate`
See [reference.md Section 2](./reference.md#section-2--sync).

### Stage 3 — Doc & Test Update (Parallel)

Update INTENT.md/DETAIL.md and organize test.ts/spec.ts based on changed files.
Two independent agents run in parallel on non-overlapping file sets.

Agent: `context-manager` (sonnet) — document updates (INTENT.md / DETAIL.md)
Agent: `implementer` (sonnet) — test organization (test.ts / spec.ts)

If either agent (`context-manager` or `implementer`) fails, the orchestrator
marks the stage as failed. Stage 4 (cache hash save) is skipped when any prior
stage reported an error, ensuring the failed operation is retried on next run.

See [reference.md Section 3](./reference.md#section-3--doc--test-update).

### Stage 4 — Finalize

1. Verify all prior stages completed without errors. If any stage reported an
   error, skip hash save and report the error — this ensures the next incremental
   run re-processes the failed work.
2. `cache_manage({ action: "save-hash", cwd: "<path>", skillName: "update", hash: currentHash })`
3. Output consolidated report
   See [reference.md Section 4](./reference.md#section-4--finalize).

## Available MCP Tools

| Tool                 | Stage | Purpose                                            |
| -------------------- | ----- | -------------------------------------------------- |
| `cache_manage`       | 0, 4  | Incremental gate: compute and persist project hash |
| `fractal_scan`       | 1     | Project structure scan                             |
| `fractal_navigate`   | 1     | Tree traversal and classification                  |
| `test_metrics`       | 1, 3  | 3+12 rule validation                               |
| `drift_detect`       | 2     | Drift detection                                    |
| `lca_resolve`        | 2     | Determine correct placement for reclassification   |
| `structure_validate` | 2     | Structure validity check                           |
| `doc_compress`       | 3     | Document size check                                |
| `ast_analyze`        | 3     | LCOM4, CC metrics                                  |

## Options

> Options are LLM-interpreted hints, not strict CLI flags. Natural language works equally well (e.g., "just scan" instead of `--scan-only`).

```
/filid:filid-update [path] [--force] [--scan-only] [--no-sync] [--auto-approve]
```

| Option           | Type   | Default | Description                                |
| ---------------- | ------ | ------- | ------------------------------------------ |
| `path`           | string | cwd     | Target directory                           |
| `--force`        | flag   | off     | Ignore cache, run full scan                |
| `--scan-only`    | flag   | off     | Run Stage 1 only (skip sync/update)        |
| `--no-sync`      | flag   | off     | Skip Stage 2 (scan + doc/test update only) |
| `--auto-approve` | flag   | off     | Skip user approval in sync stage           |

## Quick Reference

> **Internal skill** (`user_invocable: false`) — invoked by orchestrator skills such as `filid-pull-request`, `filid-pipeline`, `filid-resolve`. Not intended for direct user invocation.

```
Stages:   Change Detection → Scan → Sync (conditional) → Doc & Test Update → Finalize
Agents:   qa-reviewer (Stage 1), drift-analyzer+restructurer (Stage 2), context-manager+implementer (Stage 3)
Cache:    ~/.claude/plugins/filid/{cwdHash}/run-update.hash
```

Key rules:

- Without `--force`, exits immediately when no changes detected since last run
- Stage 2 (Sync) runs only when critical/high violations are present
- INTENT.md must stay within the 50-line limit
- test.ts/spec.ts must follow the 3+12 rule (max 15 test cases per file)
