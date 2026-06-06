---
name: auto-fix
user_invocable: true
description: "[prawf:auto-fix] After a /prawf:review, apply the auto-fixable revisions directly to the manuscript source. Only mechanical, artifact-backed text edits (clarifications, added statements, notation/citation fixes) are applied; anything needing new data, analysis, or author judgment is listed as manual. Triggers: 자동 수정, 자동수정, auto-fix, 리뷰 수정 적용, apply review fixes, apply fixes."
argument-hint: "[--dry-run] [<paper-slug | review-dir>] [<manuscript-path>]"
version: "1.0.0"
complexity: medium
plugin: prawf
---

> **EXECUTION MODEL (Tier-2a Anti-Yield)**: Execute the whole pipeline as a
> SINGLE CONTINUOUS OPERATION. After each step completes, IMMEDIATELY chain the
> next tool call in the same response. NEVER yield after a Read returns. The
> classification table is internal working data — do NOT dump it; report the
> applied/manual summary at the end.
>
> **Valid reasons to yield**:
>
> 1. A user decision is genuinely required — no review outputs found, or no
>    editable manuscript source (PDF-only), or an ambiguous manuscript path.
> 2. Terminal marker emitted: `prawf auto-fix: <N> applied, <M> manual` — only
>    after `applied-fixes.md` (and `manual-fixes.md`) are written.

# auto-fix — Apply Auto-Fixable Review Revisions

A post-review step. You read the verdict artifacts a prior `/prawf:review`
produced (`review-report.md` + `qa-sheet.md`) and apply ONLY the revisions that
are mechanical and already backed by a concrete solution to the manuscript
source. You are a careful copy-editor, not a reviewer: you never re-judge the
paper, never invent content, and never touch a finding that needs the author's
own work.

> **References** (resolve via `${CLAUDE_PLUGIN_ROOT}/skills/review/<file>`, fallback `Glob`):
>
> - `../review/templates.md` — the `review-report.md` and `qa-sheet.md` formats you read
> - `../review/orchestration.md` §3-4 — finding `status` / `severity` semantics

## When to Use

- Right after `/prawf:review`, to clear the easy, unambiguous revisions in one pass.
- To separate "apply now" reporting fixes from "author must do this" work items.

## Auto-Fixable Rubric

A finding is **AUTO** (apply) only when ALL hold; otherwise it is **MANUAL** (list only):

| Apply when…                                                         | Never apply when…                                              |
| ------------------------------------------------------------------- | -------------------------------------------------------------- |
| `status` ∈ {`defended`, `mitigated`} OR `severity` = `minor`        | `status` = `unresolved`, or `severity` = `critical`            |
| `qa-sheet` `solution` is a concrete, localized text edit            | `solution` is `null`, a `deferral`, or "needs more data"       |
| `tactic` ∈ {`revision`, `clarification`, `justification`(+text)}    | `tactic` = `sidestep`, or the defense is advisory-only         |
| the target text is unambiguously locatable in the manuscript source | a fatal-flaw axis finding, or the edit needs new analysis/data |

Any **Never apply when** condition overrides a matching **Apply when** condition —
e.g. a `minor` finding that is still `unresolved` is **MANUAL**, never AUTO.

Auto-fixable examples: add a data-availability / COI statement, add a Limitation
paragraph the strategist already drafted, fix notation/terminology consistency,
add a citation the review identified by name, soften an overclaim to match the
evidence, insert a correction the author already supplied in the rebuttal.

## Core Workflow

### Step 1 — Locate inputs (direct)

1. Resolve the review directory: from `<paper-slug | review-dir>` or the most
   recent `.prawf/review/<slug>/`. Read `review-report.md` and `qa-sheet.md`.
   If neither exists, stop and tell the user to run `/prawf:review` first.
2. Resolve the **manuscript source**: prefer `<manuscript-path>`; otherwise read
   the input recorded in `paper-profile.md`. It MUST be an editable text source
   (markdown / LaTeX). If only a PDF exists, do NOT edit — skip to Step 4 and
   emit the fixes as an instruction list for the author.
3. Read `paper-normalized.md` to map each finding's coordinate to the quoted
   source text (line numbers differ between the snapshot and the source — match
   by the quoted evidence, never by raw line number).

**→ Immediately proceed to Step 2.**

### Step 2 — Classify (direct)

Walk every finding in `review-report.md`, joined with its `qa-sheet.md` row.
Tag each `AUTO` or `MANUAL` per the rubric above. When in doubt, choose `MANUAL`
— a missed easy fix is far safer than a wrong edit to someone's paper.

**→ Immediately proceed to Step 3.**

### Step 3 — Apply AUTO fixes (direct)

For each `AUTO` finding, in source order:

1. Locate the target text in the manuscript by its quoted evidence/context.
2. Apply the minimal localized `Edit`. Use the `solution` text verbatim where the
   strategist supplied it; otherwise make the smallest change that resolves the
   finding. **Never fabricate** data, results, citations, or references — if the
   fix would require inventing content, re-tag it `MANUAL`.
3. If the target cannot be located unambiguously, re-tag it `MANUAL` (do not guess).

With `--dry-run`, do NOT edit — record the intended before/after only.

> **Safety**: edit the manuscript in place; work on a version-controlled or backed-up
> copy. The `applied-fixes.md` changelog is the audit trail for reverting.

**→ After all AUTO edits (or dry-run preview), immediately proceed to Step 4.**

### Step 4 — Report (direct)

Write to the review directory:

1. `applied-fixes.md` — one row per applied (or, in dry-run, would-apply) edit:
   finding-id, axis, location, before → after, and the source rationale.
2. `manual-fixes.md` — every `MANUAL` finding with its reason (unresolved /
   needs-data / ambiguous / fatal-flaw), the `qa-sheet` question, and any drafted
   solution, so the author can act on it.

Emit the terminal marker `prawf auto-fix: <N> applied, <M> manual`.

**After both files are written, execution is COMPLETE.**

## Hard Rules

- Apply ONLY per the rubric; default to `MANUAL` on any doubt.
- NEVER fabricate content, NEVER touch `unresolved` / `critical` / fatal-flaw
  findings, NEVER re-run or re-judge the review.
- NEVER edit anything outside the manuscript source and the review directory.
- `--dry-run` must apply zero edits.

## Options

| Option      | Default | Description                                           |
| ----------- | ------- | ----------------------------------------------------- |
| `--dry-run` | off     | Preview the would-apply edits; change nothing on disk |

## Quick Reference

```
/prawf:auto-fix                         # apply auto-fixable revisions from the latest review
/prawf:auto-fix --dry-run               # preview only, change nothing
/prawf:auto-fix my-paper paper.md       # explicit review slug + manuscript path

Input:   review-report.md + qa-sheet.md (from /prawf:review) + manuscript source
Applies: minor / mitigated / defended findings with a concrete, locatable text edit
Skips:   unresolved · critical · fatal-flaw · needs-new-data · ambiguous → manual-fixes.md
Output:  applied-fixes.md (changelog) + manual-fixes.md (author to-do). No verdict.
```
