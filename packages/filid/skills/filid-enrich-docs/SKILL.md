---
name: filid-enrich-docs
user_invocable: true
description: "[filid:filid-enrich-docs] Audit INTENT.md quality under a target directory, classify files as RICH/SPARSE/MISSING, and enrich low-quality docs in parallel via context-manager with an approval gate and 50-line validation."
argument-hint: "[path] [--depth N] [--min-quality 0-100] [--skip-rich] [--dry-run] [--auto-approve] [--include-detail]"
version: "1.0.0"
complexity: complex
plugin: filid
---

> **EXECUTION MODEL (Tier-2b interactive-aware)**: Execute all stages as a
> SINGLE CONTINUOUS OPERATION EXCEPT at Stage 5 (Approval Gate) when
> `--auto-approve` is absent. At that EXACT step, `AskUserQuestion` yield
> is REQUIRED. At all other stages, NEVER yield.
>
> **Under `--auto-approve` mode**: Stage 5 approval is skipped; EXECUTION
> MODEL applies to every stage without exception.
>
> **Valid reasons to yield**:
> 1. Stage 5 interactive approval active (no `--auto-approve`)
> 2. Terminal stage marker emitted: `Enrich-docs complete: N files enriched`, `Enrich-docs dry-run complete`, `Enrich-docs skipped: all RICH`, or `Enrich-docs cancelled`
>
> **HIGH-RISK YIELD POINTS**:
> - After Stage 2 Discovery returns the INTENT.md list — immediately chain Stage 3 scoring in the same turn
> - After Stage 3 Quality Audit classification — chain Stage 4 plan generation without pause
> - After Stage 5 approval (or `--auto-approve`) — immediately dispatch Stage 6 parallel `context-manager` delegations
> - After parallel `context-manager` returns — chain Stage 7 validation (`doc_compress`, `structure_validate`) in the same turn
> - Stage 8 report — emit final summary AND end in the same turn

# filid-enrich-docs — INTENT.md Quality Enrichment

Audit INTENT.md files under a target directory, score their documentation
quality, and rewrite low-quality entries by delegating to `context-manager`
with real source-file context. Unlike `filid-update`, this skill has no
hash-based incremental gate — quality is always re-evaluated against heuristic
thresholds.

## Resource Index

Load these on demand; none are required to execute the workflow end-to-end.

| File                             | When to load                                                             |
| -------------------------------- | ------------------------------------------------------------------------ |
| [reference.md](./reference.md)   | Detailed per-stage mechanics, MCP call signatures, delegation templates  |
| [tables.md](./tables.md)         | Option defaults, MCP tool summary, agent roster, comparison with `filid-update` |
| [examples.md](./examples.md)     | Concrete invocation patterns, natural-language equivalents, report snippets |

## When to Use This Skill

- After initial `filid-setup` scaffolded empty or boilerplate INTENT.md files
- When a directory tree contains INTENT.md files written before the underlying
  implementation stabilized
- To raise documentation quality across a subtree without waiting for a git diff
- Before `filid-review` or `filid-context-query` to ensure the module chain
  carries enough signal for downstream consumers

For the precise distinction from `filid-update`, see
[tables.md — Difference from filid-update](./tables.md#difference-from-filid-update).

## Core Workflow

### Stage 1 — Path Validation

Verify the target directory exists and belongs to a FCA-AI project (presence
of `.filid/config.json` at any ancestor). Resolve `--depth` against the
target. Capture the `[filid:lang]` tag from the UserPromptSubmit hook for
downstream delegations.
See [reference.md Section 1](./reference.md#section-1--path-validation).

### Stage 2 — Discovery

Collect every `INTENT.md` under the target directory with `Glob`, then for
each file capture: absolute path, content, line count, owning directory, and
immediate child directories. When `--include-detail` is set, DETAIL.md files
are collected alongside INTENT.md entries. Classify every module root via
`fractal_scan` and drop `organ` nodes (INTENT.md is prohibited there).
See [reference.md Section 2](./reference.md#section-2--discovery).

### Stage 3 — Quality Audit

Score each file against the four-axis heuristic (Structure, Conventions,
Boundaries, Dependencies). Each axis contributes 25 points; total ∈ [0, 100].
Classify by thresholds:

- **RICH** (score ≥ `min-quality`, default 70) → skipped
- **SPARSE** (0 < score < `min-quality`) → enrichment candidate
- **MISSING** (file absent in a fractal directory) → creation candidate

See [reference.md Section 3](./reference.md#section-3--quality-audit) for the
full rubric, signal detectors, and DETAIL.md rubric overrides.

### Stage 4 — Enrichment Plan

For each SPARSE/MISSING entry, build an enrichment scope: target INTENT.md
path, child directories to cite in Structure, implementation files under the
module root to read (capped at 6 per file to preserve context), and the set
of axes to rewrite. `--skip-rich` is always in effect — RICH entries never
appear in the plan.
See [reference.md Section 4](./reference.md#section-4--enrichment-plan).

### Stage 5 — Approval Gate <!-- [INTERACTIVE] -->

Unless `--auto-approve` is set, present the plan summary (counts by class,
per-file axes to rewrite, estimated enrichments) and call `AskUserQuestion`
with three options: `approve`, `modify`, `cancel`. `--dry-run` short-circuits
to Stage 8 without approval and without writes.
See [reference.md Section 5](./reference.md#section-5--approval-gate).

### Stage 6 — Parallel Enrichment

Dispatch batched `context-manager` subagent calls. Each batch contains at
most 4 files so downstream agent prompts stay bounded. Batches run in
parallel in a single tool-call block. Every delegation includes the target
path, current content (or `MISSING`), implementation files to read, axes to
rewrite, the resolved language, and the 50-line + English-heading constraint.
See [reference.md Section 6](./reference.md#section-6--parallel-enrichment)
for the full delegation template.

### Stage 7 — Validate

For every rewritten file, call `doc_compress` (50-line enforcement) and then
`structure_validate` (3-tier boundary sections present). A `doc_compress`
failure triggers one second-pass retry via `context-manager`; any other
validation failure reverts the on-disk content and marks the file as
`NEEDS_REWORK`.
See [reference.md Section 7](./reference.md#section-7--validate).

### Stage 8 — Report

Emit the consolidated report: totals by class, per-file before/after line
counts, axes rewritten, skipped RICH count, validation outcomes, and the
terminal stage marker. Terminal marker strings are listed in
[tables.md — Terminal Stage Markers](./tables.md#terminal-stage-markers).
See [reference.md Section 8](./reference.md#section-8--report).

## Key Rules

- Quality is **always re-evaluated** — there is no incremental hash gate
- RICH files are never rewritten, regardless of age
- Section headings MUST remain in English; body follows `[filid:lang]`
- The 50-line INTENT.md limit is non-negotiable — rejected files are reverted
- `context-manager` is the only write-capable agent used by this skill
- `organ` modules are excluded from the audit — they must never hold INTENT.md

For argument defaults, MCP tool signatures, agent roles, and invocation
examples, load the resource index files above instead of inlining them here.
