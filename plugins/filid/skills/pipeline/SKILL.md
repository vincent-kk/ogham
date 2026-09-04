---
name: pipeline
user-invocable: true
description: 'Run the full merge-track cycle — pull-request, cross-review, resolve, revalidate — as one continuous operation with resume support. Use to take a branch from changes to a final review verdict.'
argument-hint: '[--from STAGE] [--base REF] [--draft] [--skip-enrich] [--force] [--title TITLE] [--push|--no-push]'
version: '1.0.0'
complexity: complex
plugin: filid
---

# pipeline — End-to-End Merge-Track Cycle

> **EXECUTION MODEL**: run every stage as a SINGLE CONTINUOUS OPERATION. Never yield after a stage's `Skill()` call returns, after a git command, or after a `gh` operation — chain the next stage in the same turn.
>
> **HIGH-RISK YIELD POINT**: the `resolve` → `revalidate` transition. `resolve` ends with a commit, which _feels_ like completion and **is not**. Invoke `Skill("filid:revalidate")` immediately after `resolve` succeeds.

The pipeline is a pure orchestrator. Every stage executes in the main context via `Skill()`; stages communicate through files under the review directory. The pipeline itself measures nothing and edits nothing.

## References

Resolve files relative to this `SKILL.md`:

- `reference.md` — entry-point table, resume rules, per-stage failure handling.

## Stage Alias Table

| Alias        | Invocation                                              | Precondition                               |
| ------------ | ------------------------------------------------------- | ------------------------------------------ |
| `pr-create`  | `Skill("filid:pull-request", "--auto-approve <flags>")` | none                                       |
| `review`     | `Skill("filid:cross-review", "<flags>")`                | PR exists (`gh pr view` exit 0)            |
| `resolve`    | `Skill("filid:resolve", "--auto")`                      | `fix-requests.md` exists in `REVIEW_DIR`   |
| `revalidate` | `Skill("filid:revalidate")`                             | `justifications.md` exists in `REVIEW_DIR` |

Canonical order:

```text
pr-create → review → resolve → revalidate
```

Two flags are not optional here, because both stages would otherwise stop for input: `pr-create` always gets `--auto-approve` (the `enrich-docs` approval step) and `resolve` always gets `--auto`. Resolve still prints the complete decision sheet and preserves its recommendations, but auto-selects every decision and opens no prompt. Use `/filid:pull-request` directly for document approval, or `/filid:resolve` directly for batch overrides and discussion.

## Step 1 — Assess the branch

Two commands, in this order. Do not skip the first.

1. Run `gh pr view` and keep its exit code. Exit 0 means a pull request exists.
2. Pass that as `hasPullRequest` — filid owns no PR operations, so the tool cannot determine it:

```text
mcp__plugin_filid_tools__review_state({
  action: "assess",
  projectRoot: PROJECT_ROOT,
  branchName: BRANCH,
  hasPullRequest: true | false
})
```

**Omitting `hasPullRequest` reads as "no PR".** A branch that already has an unreviewed PR then enters `pr-create` instead of `review`, where the existing-PR overwrite confirmation stops the run for input — the one place this pipeline yields by accident.

One call answers the review directory, the entry point, the base ref and the push state. Use `data.reviewDirectory` as `REVIEW_DIR`; never derive a directory name.

## Step 2 — Determine the entry point

Honour `--from STAGE` when given. Otherwise `summary.entryStage` **is** the entry — the priority order behind it is `reference.md` §1. Do not re-derive it from file listings.

`complete` requires a revalidation report whose unambiguous full `head_sha` matches the current Git HEAD and whose recorded `verdict` is `PASS`, `FAIL` or `INCONCLUSIVE`. A stale, missing or malformed report follows the remaining resume priorities; file existence alone never closes the cycle.

| `entryStage`                       | Action                                        |
| ---------------------------------- | --------------------------------------------- |
| `complete`                         | Report this HEAD's recorded verdict and END   |
| `revalidate`                       | Push first when `summary.unpushedCommits` > 0 |
| `resolve` · `review` · `pr-create` | Enter that stage                              |

`--force` re-runs from `review` and discards the cached review state — pass it through so `cross-review` prepares a fresh state.

## Step 3 — Run the remaining stages

Execute every stage from the entry point through `revalidate`, in order, in the same turn.

Between `resolve` and `revalidate`, push the branch. `revalidate` re-measures a local delta and does not require the push, but the PR must reflect what was judged.

Stage outcomes that stop the pipeline:

| Stage        | Stop condition                                                                                              |
| ------------ | ----------------------------------------------------------------------------------------------------------- |
| `pr-create`  | Any Stage 0 abort, or blocked document sync. A dirty generated path is not an abort — see `reference.md` §3 |
| `review`     | Verdict `INCONCLUSIVE` — evidence could not settle it                                                       |
| `review`     | Verdict `APPROVED` — nothing to resolve; report and END                                                     |
| `resolve`    | Typecheck failure under `--auto`                                                                            |
| `revalidate` | Never stops the pipeline; its verdict is the pipeline result                                                |

A stopped pipeline is resumable: re-run `/filid:pipeline` and Step 2 re-enters at the right stage.

## Terminal Output

```text
Pipeline: <entry stage> → <last stage>
Result: <verdict or stop reason>
```

## Options

| Option          | Type   | Default | Effect                                                                                                         |
| --------------- | ------ | ------- | -------------------------------------------------------------------------------------------------------------- |
| `--from STAGE`  | string | auto    | Entry stage: `pr-create`/`review`/`resolve`/`revalidate`                                                       |
| `--base REF`    | string | auto    | Base ref, forwarded to `pr-create` and `review`                                                                |
| `--draft`       | flag   | off     | Forwarded to `pr-create`                                                                                       |
| `--skip-enrich` | flag   | off     | Forwarded to `pr-create` — skips document sync                                                                 |
| `--force`       | flag   | off     | Restart the review from a fresh state                                                                          |
| `--title TITLE` | string | auto    | Forwarded to `pr-create`                                                                                       |
| `--push`        | flag   | on      | Forwarded to `pr-create`; `--no-push` turns it off — `pr-create` then saves the body and the cycle stops there |

## Invariants

- The pipeline never calls an MCP tool other than `review_state`, and never edits a file.
- Stage order is fixed. `--from` selects an entry, never a reordering.
- `resolve` always runs with `--auto` and `pr-create` always with `--auto-approve` here. The resolve decision sheet remains visible, but every decision is auto-selected and no batch prompt opens. A stage that stops for input has not been handed the flag that suppresses it.
- The pipeline does not end at `resolve`. Reaching `resolve` and stopping is a defect, not a completion.
