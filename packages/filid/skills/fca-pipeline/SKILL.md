---
name: fca-pipeline
user_invocable: true
description: End-to-end review pipeline orchestrator. Chains pr-create → review → resolve → revalidate with auto-detection of entry point, subagent context isolation, and file-based inter-stage communication.
version: 1.0.0
complexity: medium
---

> **EXECUTION MODEL**: Execute all stages as a SINGLE CONTINUOUS OPERATION.
> After each stage's subagent completes, IMMEDIATELY verify the success signal
> and proceed to the next stage. NEVER yield the turn between stages.
> NEVER yield the turn after an MCP tool call or subagent returns.
> On error, report it and END — do not ask for confirmation.
>
> **HIGH-RISK YIELD POINT**: The resolve → revalidate transition is where
> pipelines most commonly stall. Resolve ends with commit + push, which
> FEELS like completion but IS NOT. You MUST spawn the revalidate subagent
> immediately after resolve succeeds.

# fca-pipeline — End-to-End Review Pipeline

Orchestrate the full FCA review cycle from PR creation to final verdict
in a single command. Each stage runs in an independent subagent for context
isolation, communicating via `.filid/review/<branch>/` files.

> **References**: `reference.md` (auto-detection algorithm edge cases, flag passthrough
> matrix, file contracts, subagent delegation pattern). All execution-critical
> information is in this file.

## When to Use

- Full review cycle from PR creation to final verdict
- When you want a single command instead of 4 sequential skill invocations
- When `--auto` resolve is acceptable (pipeline always uses `--auto` for resolve)

## Pipeline Stages

```
[pr-create] → [review] → [resolve --auto] → [revalidate]
```

Each stage delegates to an existing skill. The pipeline is an orchestrator —
it does not modify individual skill behavior. Subagents use `general-purpose`
type which has access to the `Skill()` tool for invoking existing skills.

## Core Workflow

### Step 1 — Determine Entry Point

**If `--from` is specified**: validate prerequisites for the target stage,
then start there.

| `--from` value  | Prerequisite check                                             |
| --------------- | -------------------------------------------------------------- |
| `pr-create`     | None                                                           |
| `review`        | PR must exist (`gh pr view` exit code 0)                       |
| `resolve`       | `.filid/review/<branch>/fix-requests.md` must exist            |
| `revalidate`    | `.filid/review/<branch>/justifications.md` must exist          |

If a prerequisite is missing: **ABORT** with "Cannot start from `<stage>`:
`<missing condition>`. Run the preceding stage first." — then END execution.

**If `--from` is omitted**: auto-detect using priority signals. Check in
order — first match wins. If no match, immediately check the next signal.

1. Detect branch: `git branch --show-current` (Bash)
2. Normalize: `review_manage(action: "normalize-branch", projectRoot: <project_root>, branchName: <branch>)` MCP tool
3. Check signals in priority order:

| Priority | Signal | Entry stage |
| -------- | ------ | ----------- |
| 1 | `.filid/review/<branch>/re-validate.md` exists | Pipeline **complete** — report existing results and END execution |
| 2 | `.filid/review/<branch>/justifications.md` exists + unpushed commits | Execute `git push` and enter `revalidate` (see details below) |
| 3 | `.filid/review/<branch>/justifications.md` exists (all pushed) | `revalidate` |
| 4 | `.filid/review/<branch>/fix-requests.md` exists | `resolve` |
| 5 | None of the above → check PR: `gh pr view` (Bash) | `review` if PR exists, `pr-create` if not |

**Priority 2 details**: Detect unpushed commits via
`git log @{upstream}..HEAD --oneline 2>/dev/null`. If no upstream is configured,
treat as "unpushed" and attempt `git push -u origin <branch>`. If push fails →
pipeline **ERROR** — report "Push failed: `<error>`. Push manually and re-run."
and END execution. If push succeeds → enter `revalidate`.

See `reference.md` for the full auto-detection algorithm with edge cases.

**→ After entry point is determined, immediately proceed to Step 2. Do NOT pause or summarize the detection result.**

### Step 2 — Execute Pipeline Stages

Execute stages sequentially from the determined entry point. Each stage is
delegated to an **independent Task subagent** (`general-purpose`) for
context isolation. Subagents invoke existing skills via the `Skill()` tool.

#### Stage: pr-create

- **Subagent invokes**: `Skill("filid:fca-pull-request")`
- **Pass through flags**: `--base`, `--draft`, `--skip-update`, `--title`
- **Success signal**: subagent completes without error
- **Failure**: END execution with error — "PR creation failed: `<error>`"
- **Output**: GitHub PR created/updated
- **→ After subagent completes, immediately proceed to review stage.**

#### Stage: review

- **Subagent invokes**: `Skill("filid:fca-review --scope=pr")`
- **Pass through flags**: `--base`, `--force`, `--no-structure-check`
- **Success signal**: `review-report.md` exists (written by Phase D regardless of verdict)
- **Early exit (APPROVED)**: If review verdict is `APPROVED` and no `fix-requests.md`
  is generated → skip `resolve` + `revalidate`. Report "Review approved — no fixes needed." and END execution. Do not ask the user anything.
- **Early exit (INCONCLUSIVE)**: If review verdict is `INCONCLUSIVE` → skip `resolve` +
  `revalidate`. Pipeline verdict is **FAIL**. Report "Review inconclusive — consensus not reached. Inspect `.filid/review/<branch>/review-report.md` and re-run `/filid:fca-pipeline --from=review --force`." and END execution.
- **Failure**: END execution with error — "Review failed: `<error>`"
- **Output**: `review-report.md`, `fix-requests.md` (if `REQUEST_CHANGES`)
- **→ After fix-requests.md is confirmed (REQUEST_CHANGES verdict), immediately proceed to resolve stage.**

#### Stage: resolve

- **Subagent invokes**: `Skill("filid:fca-resolve --auto")`
- **Always passes `--auto`** (pipeline implies full automation)
- **Success signal**: `.filid/review/<branch>/justifications.md` exists
- **Zero accepted fixes**: proceed to `revalidate` normally
  (`justifications.md` will exist with all-rejected entries)
- **Failure**: END execution with error — "Resolve failed: `<error>`"
- **Output**: `justifications.md`, committed + pushed changes

> **⚠️ CRITICAL — DO NOT STOP HERE**: Resolve completing (commit + push)
> is NOT the end of the pipeline. The pipeline is **incomplete** without
> the revalidate stage. You MUST spawn the revalidate subagent immediately
> after confirming `justifications.md` exists. Stopping after resolve is
> the single most common pipeline failure — do NOT let it happen.

- **→ After justifications.md is confirmed, immediately spawn the revalidate subagent. Do NOT output any text without a tool call.**

#### Stage: revalidate

- **Subagent invokes**: `Skill("filid:fca-revalidate")`
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
  how to resume: `/filid:fca-pipeline --from=<failed-stage>` — END execution.

**After reporting results, execution is COMPLETE. Do not ask the user any follow-up questions.**

## Failure Handling

| Situation                              | Pipeline behavior                                        |
| -------------------------------------- | -------------------------------------------------------- |
| review `APPROVED` (no fix-requests)    | Skip resolve + revalidate → pipeline **PASS**, END      |
| review `REQUEST_CHANGES`               | Proceed to resolve immediately                           |
| review `INCONCLUSIVE`                  | Skip resolve + revalidate → pipeline **FAIL**, report "consensus not reached", suggest `--from=review --force`, END |
| resolve completes (0 accepted fixes)   | Proceed to revalidate immediately (justifications.md exists) |
| resolve completes (N accepted fixes)   | Proceed to revalidate immediately (code committed + pushed) |
| revalidate `PASS`                      | Pipeline **PASS**, report summary, END                   |
| revalidate `FAIL`                      | Pipeline **FAIL**, report unresolved items, END          |
| Auto-detect Priority 2 `git push` fails | Pipeline **ERROR**, report push error + manual push instructions, END |
| Any stage execution error              | Pipeline **ERROR**, report stage + error + resume command, END |
| `--from` prerequisite missing          | Pipeline **ABORT** before execution, END                 |

On any failure, the pipeline stops immediately. The user can fix the issue
manually and re-run `/filid:fca-pipeline` — auto-detection will resume
from the appropriate stage.

## Available MCP Tools

| Tool             | Action             | Purpose                                          |
| ---------------- | ------------------ | ------------------------------------------------ |
| `review_manage`  | `normalize-branch` | Normalize branch name for auto-detection         |

All other operations are delegated to existing skills via `Skill()` tool.

## Options

> Options are LLM-interpreted hints, not strict CLI flags. Natural language
> works equally well (e.g., "run the full pipeline from review" instead of
> `--from=review`).

```
/filid:fca-pipeline [--from=<stage>] [--base=<ref>] [--draft] [--skip-update] [--force] [--no-structure-check] [--title=<title>]
```

| Option                 | Type   | Default | Description                                         |
| ---------------------- | ------ | ------- | --------------------------------------------------- |
| `--from`               | string | auto    | Entry stage: `pr-create`, `review`, `resolve`, `revalidate` |
| `--base`               | string | auto    | Base branch (passed to pr-create and review)        |
| `--draft`              | flag   | off     | Create PR as draft (passed to pr-create)            |
| `--skip-update`        | flag   | off     | Skip fca-update in pr-create stage                  |
| `--force`              | flag   | off     | Force restart review (passed to review)             |
| `--no-structure-check` | flag   | off     | Skip Phase A in review (passed to review)           |
| `--title`              | string | auto    | PR title (passed to pr-create)                      |

## Quick Reference

```
/filid:fca-pipeline                        # Auto-detect entry point, run to completion
/filid:fca-pipeline --from=pr-create       # Full cycle: PR → review → resolve → revalidate
/filid:fca-pipeline --from=review          # Review → resolve → revalidate
/filid:fca-pipeline --from=resolve         # Resolve → revalidate
/filid:fca-pipeline --from=revalidate      # Revalidate only

Pipeline:  [pr-create] → [review] → [resolve --auto] → [revalidate]
Stages:    Each runs in an independent subagent (context isolation)
Skills:    fca-pull-request, fca-review (--scope=pr), fca-resolve (--auto), fca-revalidate
Files:     .filid/review/<branch>/ (inter-stage communication)
Resolve:   Always --auto (accept all, commit, push, auto-revalidate)
Resume:    On failure, re-run — auto-detection picks up from the right stage
```
