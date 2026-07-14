---
name: resolve
user_invocable: true
description: '[filid:resolve] Resolve review fix requests by accepting or rejecting each item, applying accepted fixes via parallel code-surgeon subagents, recording ADR justifications for rejections, then auto-committing and pushing.'
argument-hint: '[--auto]'
version: '2.1.0'
complexity: medium
plugin: filid
---

> **EXECUTION MODEL (Tier-2b interactive-aware)**: Execute all steps as a
> SINGLE CONTINUOUS OPERATION EXCEPT at steps marked
> `<!-- [INTERACTIVE] -->` — at THOSE steps yielding is REQUIRED. Under
> `--auto`, ALL `AskUserQuestion` gates are skipped by design and the
> anti-yield model applies to every step without exception.
>
> **Valid reasons to yield**:
>
> 1. Interactive mode active AND the current step is `[INTERACTIVE]`
> 2. Terminal stage marker emitted: `Resolve complete — N accepted` or
>    `Resolve aborted`
>
> **HIGH-RISK YIELD POINTS**:
>
> - After the parallel code-surgeon block returns — chain typecheck and
>   commit in the same turn
> - After commit+push in `--auto` — immediately chain
>   `Skill("filid:revalidate")` in the same turn (primary stall point)

# resolve — Fix Request Resolution

Resolve fix requests from a completed review: accept/reject each item,
apply accepted fixes via parallel `code-surgeon` subagents, refine
rejection justifications into ADRs with debt records, then
auto-commit/push.

> **References**: `reference.md` (justifications.md template, ADR
> refinement rules, fix-item type formats, debt schema).

## When to Use

- After `/filid:cross-review` generates `fix-requests.md`
- To selectively accept or reject fix requests with formal justification
- To auto-accept all fixes and run the full resolve→revalidate cycle (`--auto`)

## Core Workflow

### Step 1 — Branch Detection & Preconditions

1. **Dirty-worktree check** — `git status --porcelain` (Bash). Non-empty:
   - `--auto`: **ABORT** — "Working tree has uncommitted changes. Stash
     or commit them before running resolve --auto."
   - interactive: <!-- [INTERACTIVE] AskUserQuestion: dirty worktree -->
     "Uncommitted changes will be included in the auto-commit. Continue
     anyway?" — "Continue anyway" / "Abort".
2. `git branch --show-current` →
   `mcp__plugin_filid_tools__review_manage(action: "normalize-branch", projectRoot, branchName)`.
3. Read `.filid/review/<normalized>/fix-requests.md`; missing → abort
   with "No fix requests found. Run /filid:cross-review first."

**→ Immediately proceed to Step 2.**

### Step 2 — Parse Fix Requests

Extract per item: Fix ID, title, severity, path, rule, recommended
action, code patch, and **Type** (`code-fix` | `promote` |
`restructure` | `harvest-required`; default `code-fix`).

> **Harvest gate**: if ANY item has `Type: harvest-required`, ABORT
> immediately (both modes): report "fix-requests.md contains
> harvest-required items — these are oracle gaps, not code defects. On a
> spike/\* branch, run /filid:harvest. On a merge-track branch, supply
> the claim's `observable` evidence or revise/retire the claim with
> explicit human confirmation. Then re-run /filid:cross-review." Emit
> `Resolve aborted` and END. `harvest-required` items are NEVER
> dispatched to code-surgeon / promote / restructure — an agent cannot
> attest its own acceptance criteria.

> **Tolerant parser**: strip a leading `filid:` prefix from type values
> before enum matching (`filid:promote` ≡ `promote`); unknown tokens
> fall back to `code-fix`. Canonical matcher:
> `src/lib/normalizeFixRequest.ts` `normalizeFixRequestType`.

**→ Immediately proceed to Step 3.**

### Step 3 — Accept / Reject Selection

> `--auto`: **accept ALL items, skip the question, proceed to Step 4.**
> Note: `--auto` bypasses `INTENT.md` "Ask first" gates — a fix can pass
> typecheck + tests yet be the wrong _resolution_ (e.g. deleting a
> planned-but-unimplemented contract field). Review auto-applied
> contract changes against the design specs before merge.

<!-- [INTERACTIVE] AskUserQuestion: per-fix accept/reject decision -->

For each item, `AskUserQuestion`:
"FIX-XXX: <title> (Severity: <severity>)\nPath: <path>\nAction:
<recommended action>" — options **Accept** (apply recommended fix) /
**Reject** (defer with justification).

**→ Immediately proceed to Step 4.**

### Step 4 — Apply Accepted Fixes

**First**, capture the base SHA: `base_sha = git rev-parse HEAD` — the
pre-fix baseline written to `justifications.md` as `resolve_commit_sha`
in Step 6 (revalidate diffs `resolve_commit_sha..HEAD`).

**Phase 4a — code fixes (parallel).** Dispatch all accepted `code-fix`
items **in a single response** as parallel foreground `Agent` calls
(`subagent_type: "filid:code-surgeon"`, model `sonnet`, NO
`run_in_background`) — foreground parallel calls return together,
giving a deterministic sync point before Phase 4b. Each call carries the
target path, the recommended action, and the code patch, with the
instruction to apply the fix directly.

**Phase 4b — structural fixes (sequential, after 4a).**

- `promote` items → `Skill("filid:promote", "<target_path>")`; no
  eligible files → log "SKIP — no stable test.ts found", continue.
- `restructure` items →
  `Skill("filid:restructure", "<target_path> --auto-approve")`; failure
  or no actionable changes → log "SKIP — restructure not applicable",
  continue.

Structural fix failures MUST NOT block the pipeline — `filid:revalidate`
catches remaining issues.

**→ Immediately proceed to Step 5.**

### Step 5 — Process Rejected Items

> `--auto`: skip entirely (no rejections exist).

For each rejected fix:

<!-- [INTERACTIVE] AskUserQuestion: rejection justification collection -->

1. Collect the developer's justification (`AskUserQuestion`, free text).
2. Refine it into a structured ADR (Context / Decision / Consequences —
   rules in `reference.md`).
3. Create the debt record:
   `mcp__plugin_filid_tools__debt_manage(action: "create", projectRoot, debtItem: { fractal_path, file_path, created_at, review_branch, original_fix_id, severity, rule_violated, metric_value, title, original_request, developer_justification, refined_adr })`.

**→ Immediately proceed to Step 6.**

### Step 6 — Write justifications.md

Write `.filid/review/<branch>/justifications.md` (template:
`reference.md`) with frontmatter `resolve_commit_sha: <base_sha>` — the
Step 4 pre-fix SHA, NOT current HEAD (after the Step 7 commit, HEAD
moves; the delta must contain only the fix changes).

**→ Immediately proceed to Step 7.**

### Step 7 — Typecheck, Stage & Commit

With accepted fixes:

1. **Typecheck gate** — `npx tsc --noEmit` (Bash) from the project root
   (monorepos: add `--project <path>` as needed). FAIL:
   - `--auto`: **ABORT** — "Typecheck failed after applying fixes.
     Review code-surgeon output."
   - interactive: <!-- [INTERACTIVE] AskUserQuestion: typecheck failure -->
     "Typecheck failed. Commit anyway?" — "Commit anyway" / "Abort and
     review" (Abort → stop, no commit).
2. **Stage ONLY code + debt files** —
   `git add <modified files> <.filid/debt/ files>`. NEVER stage
   `justifications.md` or anything under `.filid/review/` — those are
   gitignored local inter-stage files, and an explicit `git add`
   overrides `.gitignore`.
3. **Commit**: `fix(filid): resolve <comma-separated accepted FIX-IDs> from review`

With NO accepted fixes (all rejected): stage and commit only debt files
(`chore(filid): record fix rejections from review`); nothing at all →
skip commit and typecheck.

**→ Immediately proceed to Step 8.**

### Step 8 — Push

1. `git rev-parse --abbrev-ref @{upstream}` — no upstream → skip push,
   inform "No upstream branch. Push manually when ready.", proceed to
   Step 9.
2. `git push`. On failure:
   - `--auto`: **ABORT** — "Push failed: `<error>`. Push manually and
     re-run `/filid:pipeline --from=revalidate`." END (no
     AskUserQuestion in `--auto`).
   - interactive: <!-- [INTERACTIVE] AskUserQuestion: push failure -->
     "Push failed: <error>." — "Continue to revalidate anyway" /
     "Stop here".

**→ On success (or Continue), immediately proceed to Step 9.**

### Step 9 — Revalidate Handoff <!-- [INTERACTIVE] AskUserQuestion: revalidate offer -->

> `--auto`: skip the question — **immediately invoke
> `Skill("filid:revalidate")`**, then end.

`AskUserQuestion`: "Fixes committed and pushed. Run revalidate now?"
(all-rejected variant: "All fix items were rejected. Run revalidate now
to evaluate justifications?") — "Yes — run now" / "Not now".

- **Yes** → invoke `Skill("filid:revalidate")` in the same response —
  do NOT yield between the answer and the invocation.
- **Not now** → done. (`filid:revalidate` later evaluates the rejected-
  item justifications and returns PASS if all are constitutional.)

**After revalidate is invoked (or skipped), execution is COMPLETE.**

## Available MCP Tools

| Tool                                     | Action             | Purpose                      |
| ---------------------------------------- | ------------------ | ---------------------------- |
| `mcp__plugin_filid_tools__review_manage` | `normalize-branch` | Review directory resolution  |
| `mcp__plugin_filid_tools__debt_manage`   | `create`           | Debt record per rejected fix |

## Options

> Options are LLM-interpreted hints, not strict CLI flags.

| Option   | Type | Default | Description                                                      |
| -------- | ---- | ------- | ---------------------------------------------------------------- |
| `--auto` | flag | off     | Accept all fixes, skip user prompts, auto-commit/push/revalidate |

## Quick Reference

```
/filid:resolve           # Interactive resolve on current branch
/filid:resolve --auto    # Accept all, commit, push, revalidate automatically

Input:    .filid/review/<branch>/fix-requests.md
Outputs:  justifications.md (local), .filid/debt/*.md, git commit + push
Steps:    1 Preconditions → 2 Parse (+harvest gate) → 3 Select →
          4 Apply (base SHA; 4a ∥ code-surgeon, 4b promote/restructure) →
          5 Rejections → 6 justifications.md → 7 Typecheck+commit →
          8 Push → 9 Revalidate
Agents:   filid:code-surgeon (4a)   Skills: filid:promote, filid:restructure (4b)
--auto:   aborts on dirty worktree / typecheck failure / push failure
```
