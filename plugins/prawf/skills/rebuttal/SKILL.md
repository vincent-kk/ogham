---
name: rebuttal
user_invocable: true
description: "[prawf:rebuttal] Turn real external reviewer comments into a point-by-point rebuttal letter and a revision checklist. Skips the attack round (the external reviewers already attacked) and runs the prawf defense round directly. Reuses the chair and rebuttal-strategist personas. Triggers: 반박문, 리뷰 응답, rebuttal letter, response to reviewers, point-by-point response, 심사평 대응."
argument-hint: "[--profile <name>] [--workdir <dir>] [<paper-path>] [<review-comments-path>]"
version: "1.0.0"
complexity: medium
plugin: prawf
---

> **EXECUTION MODEL (Tier-2a Anti-Yield)**: Execute the whole pipeline as a
> SINGLE CONTINUOUS OPERATION. After each step completes, IMMEDIATELY chain the
> next tool call in the same response. NEVER yield after a `Task` subagent
> returns. The intermediate `external-findings.md` and `rebuttal.md` are
> internal working data — do NOT summarize them mid-pipeline.
>
> **Valid reasons to yield**:
>
> 1. A user decision is genuinely required (no paper or no review comments provided).
> 2. Terminal marker emitted: `prawf rebuttal: complete` — only after
>    `rebuttal-letter.md` + `revision-checklist.md` are written.

# rebuttal — Response to External Reviewers

You received real reviewer comments from a venue and must respond. Unlike
`/prawf:review`, the attack round (R1) is SKIPPED — the external reviewers have
already filed the findings. You run the prawf **defense round (R2)** over their
comments and assemble a courteous, point-by-point rebuttal letter plus an
actionable revision checklist. The chair (`../../agents/chair.md`) assembles; the
rebuttal-strategist (`../../agents/rebuttal-strategist.md`) defends.

> **References** (resolve via `${CLAUDE_PLUGIN_ROOT}/skills/review/<file>`, fallback `Glob`):
>
> - `../review/orchestration.md` §4.3 — downgrade burden, fatal-flaw discipline
> - `../review/prompt-templates.md` §3 — R2 defense prompt
> - `../review/templates.md` — rebuttal letter format (Revision / Justification / Clarification tagging)

## When to Use

- Drafting an author response after a journal/conference review.
- Producing a point-by-point reply with a paired list of concrete revisions.
- Triaging which reviewer comments are Revisions, Justifications, or Clarifications.

## Core Workflow

### Step 1 — Inputs & comment normalization (chair, direct)

First, **resolve `WORKDIR`** per [`[OP: resolve_workdir]`](../_shared/operations/resolve_workdir.md)
(`--workdir` > `PRAWF_WORKDIR` > `./.prawf`); all outputs go under
`REVIEW_DIR = <WORKDIR>/review/<paper-slug>/`.

1. Take the paper and the external review comments (a file or pasted text). If
   either is missing, ask the user — this is the one valid yield point.
2. Normalize the paper into `paper-normalized.md` (reuse if it already exists).
3. Parse the external comments into `external-findings.md`: map each reviewer
   point to a structured finding (axis, severity, `location` coordinate, claim,
   reviewer-of-origin). This stands in for `findings/round-1-<axis>.md`; do NOT
   re-derive findings yourself — take the reviewers' points as given.

**→ Immediately proceed to Step 2.**

### Step 2 — R2 Defense (strategist)

Spawn `rebuttal-strategist` with `external-findings.md` as input, per
`../review/prompt-templates.md` §3. Substitute the §3 `SOUNDNESS_FINDINGS` slot
with the `external-findings.md` path, and the `GATE` slot from a prior review's
`paper-profile.md` when one exists in this REVIEW_DIR; otherwise default
`major` (this skill has no `--gate` option). It writes `rebuttal.md`: per comment a
`tactic` (`revision | justification | clarification | sidestep | deferral`), a
point-by-point defense, and a `solution` only when one is clear (null otherwise).
A downgrade claim still requires a verifiable artifact; fatal flaws are answered
honestly, not waved away.

**→ After `rebuttal.md` is written, immediately proceed to Step 3.**

### Step 3 — Assemble letter + checklist (chair, direct)

Read `../review/templates.md`, then write into `REVIEW_DIR`:

1. `rebuttal-letter.md` — a courteous point-by-point response. Each item is tagged
   **Revision** (a change made), **Justification** (defended with evidence), or
   **Clarification** (a limitation acknowledged / misunderstanding corrected),
   citing the `paper-normalized.md` coordinate of each change. Acceptive, calm tone.
2. `revision-checklist.md` — every comment as an actionable revision row: comment →
   planned change → location → status (`done | planned | declined`), with a brief
   justification for any declined item.

Emit the terminal marker `prawf rebuttal: complete`.

**After both files are written, execution is COMPLETE.**

## Options

| Option             | Default    | Description                                       |
| ------------------ | ---------- | ------------------------------------------------- |
| `--profile <name>` | auto       | Field profile for framework-aware defense framing |
| `--workdir <dir>`  | `./.prawf` | Output root (or `PRAWF_WORKDIR` env)              |

## Quick Reference

> **Note**: If `/prawf:review` already ran on the same paper in the same
> `REVIEW_DIR`, pass a separate `--workdir` to avoid overwriting `rebuttal.md`.

```
/prawf:rebuttal paper.pdf reviews.txt      # rebuttal letter + revision checklist
/prawf:rebuttal --profile cs-ml            # CS/ML framing for the defense

Flow:    parse comments → external-findings.md → R2 defense (rebuttal.md)
         → rebuttal-letter.md + revision-checklist.md   (R1 attack is skipped)
Reuses:  chair (assemble) + rebuttal-strategist (defend)
Output:  rebuttal-letter.md (point-by-point, R/J/C tagged) + revision-checklist.md
```
