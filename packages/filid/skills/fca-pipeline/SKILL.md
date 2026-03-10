---
name: fca-pipeline
user_invocable: true
description: End-to-end review pipeline orchestrator. Chains pr-create → review → resolve → revalidate with auto-detection of entry point, subagent context isolation, and file-based inter-stage communication.
version: 1.0.0
complexity: medium
---

# fca-pipeline — End-to-End Review Pipeline

Orchestrate the full FCA review cycle from PR creation to final verdict
in a single command. Each stage runs in an independent subagent for context
isolation, communicating via `.filid/review/<branch>/` files.

> **References**: `reference.md` (auto-detection algorithm, flag passthrough
> matrix, file contracts, subagent delegation pattern).

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

If a prerequisite is missing: abort with "Cannot start from `<stage>`:
`<missing condition>`. Run the preceding stage first."

**If `--from` is omitted**: auto-detect using priority signals. Check in
order — first match wins.

1. Detect branch: `git branch --show-current` (Bash)
2. Normalize: `review_manage(action: "normalize-branch", projectRoot: <project_root>, branchName: <branch>)` MCP tool
3. Check signals in priority order:

| Priority | Signal                                                             | Entry stage   |
| -------- | ------------------------------------------------------------------ | ------------- |
| 1        | `.filid/review/<branch>/re-validate.md` exists                     | Pipeline **complete** — report existing results |
| 2        | `.filid/review/<branch>/justifications.md` exists + unpushed commits (`git log @{upstream}..HEAD --oneline` non-empty) | Execute `git push` (Bash). If push fails → pipeline **ERROR**, abort with "Push failed: `<error>`. Push manually and re-run." If push succeeds → enter `revalidate` |
| 3        | `.filid/review/<branch>/justifications.md` exists (all pushed)     | `revalidate`  |
| 4        | `.filid/review/<branch>/fix-requests.md` exists                    | `resolve`     |
| 5        | None of the above → check PR: `gh pr view` (Bash)                 | `review` if PR exists, `pr-create` if not |

See `reference.md` for the full auto-detection algorithm with edge cases.

### Step 2 — Execute Pipeline Stages

Execute stages sequentially from the determined entry point. Each stage is
delegated to an **independent Task subagent** (`general-purpose`) for
context isolation. Subagents invoke existing skills via the `Skill()` tool.

#### Stage: pr-create

- **Subagent invokes**: `Skill("filid:fca-pull-request")`
- **Pass through flags**: `--base`, `--draft`, `--skip-update`, `--title`
- **Success signal**: subagent completes without error
- **Failure**: abort pipeline — "PR creation failed: `<error>`"
- **Output**: GitHub PR created/updated

#### Stage: review

- **Subagent invokes**: `Skill("filid:fca-review --scope=pr")`
- **Pass through flags**: `--base`, `--force`, `--no-structure-check`
- **Success signal**: `.filid/review/<branch>/fix-requests.md` exists
- **Early exit**: If review verdict is `APPROVED` and no `fix-requests.md`
  is generated → skip `resolve` + `revalidate`, pipeline **PASS** with
  "Review approved — no fixes needed."
- **Failure**: abort pipeline — "Review failed: `<error>`"
- **Output**: `review-report.md`, `fix-requests.md` (if `REQUEST_CHANGES`)

#### Stage: resolve

- **Subagent invokes**: `Skill("filid:fca-resolve --auto")`
- **Always passes `--auto`** (pipeline implies full automation)
- **Success signal**: `.filid/review/<branch>/justifications.md` exists
- **Zero accepted fixes**: proceed to `revalidate` normally
  (`justifications.md` will exist with all-rejected entries)
- **Failure**: abort pipeline — "Resolve failed: `<error>`"
- **Output**: `justifications.md`, committed + pushed changes

#### Stage: revalidate

- **Subagent invokes**: `Skill("filid:fca-revalidate")`
- **No additional flags**
- **Success signal**: `.filid/review/<branch>/re-validate.md` exists
- **Failure**: abort pipeline — "Revalidate failed: `<error>`"
- **Output**: `re-validate.md`, PR comment

### Step 3 — Report Results

Read the final verdict from `.filid/review/<branch>/re-validate.md`
(or the last completed stage's output) and report:

- **PASS**: all stages completed, revalidate verdict PASS
- **FAIL**: report which stage's verdict was FAIL and the reason
  (distinct from stage execution failure)
- **ERROR**: report which stage execution failed, error details, and
  how to resume: `/filid:fca-pipeline --from=<failed-stage>`

## Failure Handling

| Situation                              | Pipeline behavior                                        |
| -------------------------------------- | -------------------------------------------------------- |
| review `APPROVED` (no fix-requests)    | Skip resolve + revalidate → pipeline **PASS**            |
| review `REQUEST_CHANGES`               | Proceed to resolve                                       |
| resolve completes (0 accepted fixes)   | Proceed to revalidate (justifications.md exists)         |
| resolve completes (N accepted fixes)   | Proceed to revalidate (code committed + pushed)          |
| revalidate `PASS`                      | Pipeline **PASS**, report summary                        |
| revalidate `FAIL`                      | Pipeline **FAIL**, report unresolved items               |
| Auto-detect Priority 2 `git push` fails | Pipeline **ERROR**, report push error + manual push instructions |
| Any stage execution error              | Pipeline **ERROR**, report stage + error + resume command |
| `--from` prerequisite missing          | Pipeline **ABORT** before execution                      |

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
