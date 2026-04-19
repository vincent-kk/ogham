---
name: filid-pipeline
user_invocable: true
description: "[filid:filid-pipeline] Orchestrate the full FCA review cycle from PR creation to final verdict by chaining pr-create, review, resolve, and revalidate stages with automatic entry point detection and --from resume support."
argument-hint: "[--from STAGE] [--base REF] [--draft] [--skip-update] [--force] [--no-structure-check] [--title TITLE]"
version: "1.0.0"
complexity: medium
plugin: filid
---

> **EXECUTION MODEL**: Execute all stages as a SINGLE CONTINUOUS OPERATION.
> After each stage completes, IMMEDIATELY verify the success signal
> and proceed to the next stage. NEVER yield the turn between stages.
> NEVER yield the turn after an MCP tool call, subagent return, or Skill() completion.
> On error, report it and END — do not ask for confirmation.
>
> **HYBRID EXECUTION**: Only Phase A/B/C of the `filid:filid-review`
> stage runs in a subagent (context isolation for its ~100k token consumption).
> Phase D of `filid:filid-review` runs **in the main orchestrator** — the A/B/C
> subagent returns `{ committee, deliberation_mode, failure_reason,
> paths_to_artifacts }` on exit and main dispatches team / solo-adjudicator /
> fail via the `verdict_gate` rule. All other stages (`pr-create`,
> `filid:filid-resolve`, `filid:filid-revalidate`) also execute directly in the main
> context via `Skill()`.
>
> **HIGH-RISK YIELD POINT**: The resolve → revalidate transition is where
> pipelines most commonly stall. Resolve ends with commit + push, which
> FEELS like completion but IS NOT. You MUST invoke `Skill("filid:filid-revalidate")`
> immediately after resolve succeeds.

# filid-pipeline — End-to-End Review Pipeline

Orchestrate the full FCA review cycle from PR creation to final verdict
in a single command. Uses a **hybrid execution model**: only Phase A/B/C of
`filid:filid-review` runs in an independent subagent for context isolation (~100k
tokens). Phase D of `filid:filid-review` runs in the main orchestrator, as do
`pr-create`, `filid:filid-resolve`, and `filid:filid-revalidate`. Stages communicate via
`.filid/review/<branch>/` files.

> **References**: `reference.md` (auto-detection algorithm edge cases, flag passthrough
> matrix, file contracts, stage execution pattern). All execution-critical
> information is in this file.

## When to Use

- Full review cycle from PR creation to final verdict
- When you want a single command instead of 4 sequential skill invocations
- When `--auto` resolve is acceptable (pipeline always uses `--auto` for resolve)

## Pipeline Stages

```
[pr-create] → [review] → [resolve --auto] → [revalidate]
```

Each stage delegates to an existing skill via `Skill()`. The pipeline is an
orchestrator — it does not modify individual skill behavior.

> **Stage alias SSoT**: `stages.md` in this directory is the canonical table
> of stage alias → skill invocation mapping and documents the bare-word token
> policy. This SKILL.md references but does not duplicate that table.

## Core Workflow

### Step 1 — Determine Entry Point

**If `--from` is specified**: validate prerequisites for the target stage,
then start there.

| `--from` value  | Prerequisite check                                             |
| --------------- | -------------------------------------------------------------- |
| `pr-create`     | None                                                           |
| `filid-review`        | PR must exist (`gh pr view` exit code 0)                       |
| `filid-resolve`       | `.filid/review/<branch>/fix-requests.md` must exist            |
| `filid-revalidate`    | `.filid/review/<branch>/justifications.md` must exist          |

If a prerequisite is missing: **ABORT** with "Cannot start from `<stage>`:
`<missing condition>`. Run the preceding stage first." — then END execution.

**If `--from` is omitted**: auto-detect using priority signals. Check in
order — first match wins. If no match, immediately check the next signal.

1. Detect branch: `git branch --show-current` (Bash)
2. Normalize: `mcp_t_review_manage(action: "normalize-branch", projectRoot: <project_root>, branchName: <branch>)` MCP tool
3. Check signals in priority order:

| Priority | Signal | Entry stage |
| -------- | ------ | ----------- |
| 1 | `.filid/review/<branch>/re-validate.md` exists | Pipeline **complete** — report existing results and END execution |
| 2 | `.filid/review/<branch>/justifications.md` exists + unpushed commits | Execute `git push` and enter `filid-revalidate` (see details below) |
| 3 | `.filid/review/<branch>/justifications.md` exists (all pushed) | `filid-revalidate` |
| 4 | `.filid/review/<branch>/fix-requests.md` exists | `filid-resolve` |
| 5 | None of the above → check PR: `gh pr view` (Bash) | `filid-review` if PR exists, `pr-create` if not |

**Priority 2 details**: Detect unpushed commits via
`git log @{upstream}..HEAD --oneline 2>/dev/null`.
- **Has unpushed commits**: Execute `git push`, then enter `filid-revalidate`.
- **All pushed**: Enter `filid-revalidate` directly.
- **No upstream tracking ref** (command fails): Skip push, enter `filid-revalidate` directly.
  The user may not have set up the remote yet — do not attempt `git push -u`.
- **Push fails**: Pipeline **ERROR** — report "Push failed: `<error>`. Push manually and re-run." and END execution.

See `reference.md` for the full auto-detection algorithm with edge cases.

**→ After entry point is determined, immediately proceed to Step 2. Do NOT pause or summarize the detection result.**

### Step 2 — Execute Pipeline Stages

Execute stages sequentially from the determined entry point. The pipeline
uses a **hybrid execution model**:

- **Subagent stage** (Phase A/B/C of `filid:filid-review` only): Delegated to an
  independent `general-purpose` Task subagent for context isolation. Phase
  A/B/C consume ~100k tokens and would degrade the main context if run
  inline. The subagent MUST NOT execute Phase D internally — nested
  `TeamCreate` spawns from a subagent context are unsupported and leak
  orphan workers. On exit the subagent returns
  `{ committee, deliberation_mode, failure_reason, paths_to_artifacts }` and
  the pipeline main dispatches Phase D itself (see Phase D Dispatch below).
- **Main context stages** (Phase D of `filid:filid-review`, plus `pr-create`,
  `filid:filid-resolve`, `filid:filid-revalidate`): Executed directly via `Skill()` in
  the orchestrator's context. These stages are lightweight and procedural —
  subagent delegation adds fragile two-level indirection (Agent → Skill() →
  internal subagents) that causes premature termination. Phase D
  additionally requires main-context team orchestration that a subagent
  cannot provide.

> **Note**: Some main-context stages still spawn their own internal subagents
> (e.g., `filid:filid-resolve` uses `code-surgeon` subagents, `filid:filid-revalidate` uses parallel
> verification subagents). "Main context execution" means the *pipeline-level*
> delegation is direct — internal skill behavior is unchanged.

#### Stage: pr-create (main context)

- **Execute**: `Skill("filid:filid-pull-request")`
- **Pass through flags**: `--base`, `--draft`, `--skip-update`, `--title`
- **Success signal**: Skill completes without error
- **Failure**: END execution with error — "PR creation failed: `<error>`"
- **Output**: GitHub PR created/updated
- **→ After Skill() completes, immediately proceed to review stage.**

#### Stage: review A/B/C (subagent — Phase D pulled up to main)

- **Subagent invokes**: `Skill("filid:filid-review", "--scope=pr", "--pipeline-mode=abc-only")`
  - The `--pipeline-mode=abc-only` hint (alias: `PIPELINE_MODE=abc-only`
    context key) tells the review skill to stop after Phase C and emit
    the Subagent Return Contract instead of executing Phase D / Step 4.5
    / Step 5 inline. Without this hint the subagent would run Phase D
    inside its own context — a nested `TeamCreate` spawn that leaks
    orphan workers and breaks the Phase-D main pull-up contract.
- **Pass through flags**: `--base`, `--force`, `--no-structure-check`
- **Success signal**: the subagent's final assistant message contains a
  fenced `SubagentReturn` YAML block with `committee`,
  `deliberation_mode`, `failure_reason`, and `paths_to_artifacts` (spec:
  `packages/filid/skills/filid-review/DETAIL.md` → `## API Contracts`).
  Cross-check that `session.md`, `verification-metrics.md`, and
  `verification-structure.md` exist at the returned paths before
  dispatching Phase D.
- **Null / missing return handling**: if the subagent exits without a
  parseable `SubagentReturn` block, treat the payload as
  `deliberation_mode: null` and let the `verdict_gate` resolve to `fail`
  → verdict `INCONCLUSIVE` in the Phase D Dispatch stage below. Do NOT
  synthesize a verdict locally.
- **Failure**: END execution with error — "Review A/B/C failed: `<error>`"
- **Output**: `structure-check.md` (if Phase A ran), `session.md`,
  `verification-metrics.md`, `verification-structure.md`. Phase D
  artifacts (`review-report.md`, `fix-requests.md`, PR comment) are
  written later by the Phase D Dispatch and finalize review stages.
- **→ After SubagentReturn is received and A/B/C artifacts are verified, IMMEDIATELY proceed to Phase D Dispatch. Do NOT yield.**

#### Stage: Phase D Dispatch (main context — within `filid:filid-review`)

After the A/B/C subagent exits, the pipeline main reads the return payload
and dispatches Phase D itself — the subagent does NOT execute Phase D. Main
MUST consume two dispatch fields from the return:

- `deliberation_mode ∈ {team, solo-adjudicator, chairperson-forbidden}`
- `failure_reason ∈ {none, phase-d-team-spawn-unavailable, team-incomplete,
  round5-exhaust, veto-deadlock}`

Apply the `verdict_gate` rule (spec:
`packages/filid/skills/filid-review/DETAIL.md` → `## API Contracts`) in
priority order — first match wins:

| Condition                                                 | Dispatch | Verdict                                   |
| --------------------------------------------------------- | -------- | ----------------------------------------- |
| `deliberation_mode` is `chairperson-forbidden` or `null`  | fail     | `INCONCLUSIVE`                            |
| `failure_reason != "none"`                                | fail     | `INCONCLUSIVE` (rationale = failure_reason) |
| `deliberation_mode == "solo-adjudicator"`                 | solo     | from the single adjudicator Task          |
| `deliberation_mode == "team"` AND `committee.length >= 2` | team     | from Phase D quorum result                |

Dispatch actions (see `filid-review/phases/phase-d-deliberation.md` Step D.1):

- **team** → `TeamCreate(review-<branch>)` + one `Task` per persona; run the
  round state machine; ALWAYS `TeamDelete` inside try/finally.
- **solo** → single standalone `Task(filid:adjudicator)` (no TeamCreate).
- **fail** → write `rounds/failure.md` with `verdict: INCONCLUSIVE`; if a
  team was already created before the failure, `TeamDelete` inside
  try/finally (orphan-log on teardown failure).

`chairperson-direct` synthesis — main writing a verdict without running
team or solo dispatch — is a **protocol violation** blocked by `verdict_gate`.
Phase D then writes `review-report.md` / `fix-requests.md` per
`filid-review/phases/phase-d-deliberation.md` Step D.6 (team/solo) or
D.7 (fail).

- **→ After Phase D dispatch completes and review-report.md is confirmed, immediately proceed to the finalize review stage below. Do NOT yield.**

#### Stage: finalize review (main context — within `filid:filid-review`)

After Phase D has written `review-report.md` (and `fix-requests.md` when
applicable) via Step D.6 or D.7, the pipeline main finalizes the review
skill in its own context. These steps used to live inside the subagent
as filid-review Step 4.5 and Step 5; they now run main-side because the
subagent exits before Phase D.

1. **Persist content hash** (filid-review Step 4.5):
   `mcp_t_review_manage(action: "content-hash", projectRoot: <project_root>, branchName: <branch>)`.
2. **PR comment** (filid-review Step 5, `--scope=pr` only):
   1. `mcp_t_review_manage(action: "format-pr-comment", projectRoot: <project_root>, branchName: <branch>)` — returns formatted markdown.
   2. `gh auth status` (Bash). If not authenticated, skip the PR comment
      quietly — no error reporting.
   3. Query existing comments via `gh pr view --json comments --jq '.comments[].body'` (Bash).
      If a `Code Review Governance` comment already exists, check that
      its body contains ALL three structural markers emitted only by
      `review_manage format-pr-comment`:
      1. `<details><summary>Phase A — Structure Compliance</summary>`
      2. `<details><summary>Review Report (Phase B~D)</summary>`
      3. Footer line `> Full report: \`.filid/review/<normalized-branch>/review-report.md\``
      If any marker is missing OR the comment was hand-rolled, **edit it
      in place** via `gh api -X PATCH repos/<owner>/<repo>/issues/comments/<id> -f body=@<file>`
      (obtain numeric `id` via `gh api repos/<owner>/<repo>/issues/<pr>/comments`).
   4. Otherwise post fresh via `gh pr comment --body-file <file>`.
3. **Verdict decision** (read `verdict` from `review-report.md`
   frontmatter):
   - **APPROVED**: skip `filid:filid-resolve` + `filid:filid-revalidate`.
     Report "Review approved — no fixes needed." and END execution. If
     `fix-requests.md` exists with 0 items, remove it via
     `Bash(rm "${review_dir}/fix-requests.md")` where `review_dir` is
     `.filid/review/<normalized-branch>`, then END.
   - **INCONCLUSIVE**: skip `filid:filid-resolve` + `filid:filid-revalidate`.
     Pipeline verdict is **FAIL**. Report "Review inconclusive — consensus
     not reached. Inspect `.filid/review/<branch>/review-report.md` and
     re-run `/filid:filid-pipeline --from=filid-review --force`." and END
     execution.
   - **REQUEST_CHANGES** (`fix-requests.md` exists and is non-empty):
     proceed to the resolve stage.

- **Output**: `content-hash.json`, PR comment (if `--scope=pr` and `gh`
  authenticated), verdict-dependent control-flow decision.
- **→ APPROVED / INCONCLUSIVE → END execution. REQUEST_CHANGES → immediately invoke `Skill("filid:filid-resolve", "--auto")` in the next response.**

#### Stage: resolve (main context)

- **Execute**: `Skill("filid:filid-resolve", "--auto")`
- **Always passes `--auto`** (pipeline implies full automation)
- **Success signal**: `.filid/review/<branch>/justifications.md` exists
- **Zero accepted fixes**: proceed to `filid:filid-revalidate` normally
  (`justifications.md` will exist with all-rejected entries)
- **Failure**: END execution with error — "Resolve failed: `<error>`"
- **Output**: `justifications.md`, committed + pushed changes

> **⚠️ DO NOT STOP HERE**: Resolve completing (commit + push) is NOT the
> end of the pipeline. The pipeline is **incomplete** without the revalidate
> stage. You MUST invoke `Skill("filid:filid-revalidate")` immediately after
> confirming `justifications.md` exists.

- **→ After justifications.md is confirmed, immediately invoke Skill("filid:filid-revalidate"). Do NOT output any text without a tool call.**

#### Stage: revalidate (main context)

- **Execute**: `Skill("filid:filid-revalidate")`
- **No additional flags**
- **Success signal**: `.filid/review/<branch>/re-validate.md` exists
- **Failure**: END execution with error — "Revalidate failed: `<error>`"
- **Output**: `re-validate.md`, PR comment
- **→ After re-validate.md is confirmed, immediately proceed to Step 3 (Report Results).**

### Step 3 — Report Results

Read the final verdict from `.filid/review/<branch>/re-validate.md`
(or the last completed stage's output) and report:

- **PASS**: all stages completed, revalidate verdict PASS — report summary and END execution.
- **FAIL**: report which stage's verdict was FAIL and the reason — END execution.
  (distinct from stage execution failure)
- **ERROR**: report which stage execution failed, error details, and
  how to resume: `/filid:filid-pipeline --from=<failed-stage>` — END execution.

**After reporting results, execution is COMPLETE. Do not ask the user any follow-up questions.**

## Failure Handling

| Situation                              | Pipeline behavior                                        |
| -------------------------------------- | -------------------------------------------------------- |
| review `APPROVED` (no fix-requests)    | Skip resolve + revalidate → pipeline **PASS**, END      |
| review `REQUEST_CHANGES`               | Proceed to resolve immediately                           |
| review `INCONCLUSIVE`                  | Skip resolve + revalidate → pipeline **FAIL**, report "consensus not reached", suggest `--from=filid-review --force`, END |
| resolve completes (0 accepted fixes)   | Proceed to revalidate immediately (justifications.md exists) |
| resolve completes (N accepted fixes)   | Proceed to revalidate immediately (code committed + pushed) |
| revalidate `PASS`                      | Pipeline **PASS**, report summary, END                   |
| revalidate `FAIL`                      | Pipeline **FAIL**, report unresolved items, END          |
| Auto-detect Priority 2 `git push` fails | Pipeline **ERROR**, report push error + manual push instructions, END |
| Any stage execution error              | Pipeline **ERROR**, report stage + error + resume command, END |
| `--from` prerequisite missing          | Pipeline **ABORT** before execution, END                 |

On any failure, the pipeline stops immediately. The user can fix the issue
manually and re-run `/filid:filid-pipeline` — auto-detection will resume
from the appropriate stage.

## Available MCP Tools

| Tool             | Action             | Purpose                                          |
| ---------------- | ------------------ | ------------------------------------------------ |
| `mcp_t_review_manage`  | `normalize-branch`       | Normalize branch name for auto-detection         |
| `mcp_t_review_manage`  | `format-pr-comment`      | Format review findings as a PR comment           |
| `mcp_t_review_manage`  | `generate-human-summary` | Generate human-readable summary of review results |

All other operations are delegated to existing skills via `Skill()` tool.

## Options

> Options are LLM-interpreted hints, not strict CLI flags. Natural language
> works equally well (e.g., "run the full pipeline from review" instead of
> `--from=filid-review`).

```
/filid:filid-pipeline [--from=<stage>] [--base=<ref>] [--draft] [--skip-update] [--force] [--no-structure-check] [--title=<title>]
```

| Option                 | Type   | Default | Description                                         |
| ---------------------- | ------ | ------- | --------------------------------------------------- |
| `--from`               | string | auto    | Entry stage: `pr-create`, `filid-review`, `filid-resolve`, `filid-revalidate` |
| `--base`               | string | auto    | Base branch (passed to pr-create and review)        |
| `--draft`              | flag   | off     | Create PR as draft (passed to pr-create)            |
| `--skip-update`        | flag   | off     | Skip update in pr-create stage                  |
| `--force`              | flag   | off     | Force restart review (passed to review)             |
| `--no-structure-check` | flag   | off     | Skip Phase A in review (passed to review)           |
| `--title`              | string | auto    | PR title (passed to pr-create)                      |

## Quick Reference

```
/filid:filid-pipeline                        # Auto-detect entry point, run to completion
/filid:filid-pipeline --from=pr-create       # Full cycle: PR → review → resolve → revalidate
/filid:filid-pipeline --from=filid-review    # Review → resolve → revalidate
/filid:filid-pipeline --from=filid-resolve   # Resolve → revalidate
/filid:filid-pipeline --from=filid-revalidate # Revalidate only

Pipeline:  [pr-create] → [review A/B/C] → [Phase D dispatch] → [finalize review] → [resolve --auto] → [revalidate]
Execution: review A/B/C = subagent (context isolation); Phase D dispatch, finalize review, and all other stages = main context (direct Skill())
Skills:    filid:filid-pull-request, filid:filid-review (--scope=pr), filid:filid-resolve (--auto), filid:filid-revalidate
Files:     .filid/review/<branch>/ (inter-stage communication)
Resolve:   Always --auto (accept all, commit, push, auto-revalidate)
Resume:    On failure, re-run — auto-detection picks up from the right stage
```
