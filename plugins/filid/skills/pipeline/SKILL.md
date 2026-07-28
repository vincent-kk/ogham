---
name: pipeline
user_invocable: true
description: '[filid:pipeline] Run the full merge-track cycle — pull-request, cross-review, resolve, revalidate — as one continuous operation with entry-point detection and resume support.'
argument-hint: '[--from STAGE] [--base REF] [--draft] [--skip-enrich] [--force] [--title TITLE]'
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

| Alias        | Invocation                               | Precondition                               |
| ------------ | ---------------------------------------- | ------------------------------------------ |
| `pr-create`  | `Skill("filid:pull-request", "<flags>")` | none                                       |
| `review`     | `Skill("filid:cross-review", "<flags>")` | PR exists (`gh pr view` exit 0)            |
| `resolve`    | `Skill("filid:resolve", "--auto")`       | `fix-requests.md` exists in `REVIEW_DIR`   |
| `revalidate` | `Skill("filid:revalidate")`              | `justifications.md` exists in `REVIEW_DIR` |

Canonical order:

```text
pr-create → review → resolve → revalidate
```

The pipeline always resolves with `--auto`. Use `/filid:resolve` directly when per-item decisions are wanted.

## Step 1 — Resolve the review directory

```text
mcp__plugin_filid_tools__review_state({
  action: "checkpoint",
  projectRoot: PROJECT_ROOT,
  branchName: BRANCH,
  baseRef: BASE_REF
})
```

Use `data.reviewDirectory` as `REVIEW_DIR`; never derive a directory name. A `missing` disposition simply means no review has started — that is the `pr-create` or `review` entry, not an error.

## Step 2 — Determine the entry point

Honour `--from STAGE` when given. Otherwise take the **first** matching row:

| Priority | Condition                                    | Entry                                          |
| -------- | -------------------------------------------- | ---------------------------------------------- |
| 1        | `re-validate.md` exists                      | Complete — report the existing verdict and END |
| 2        | `justifications.md` exists, unpushed commits | `git push`, then `revalidate`                  |
| 3        | `justifications.md` exists, all pushed       | `revalidate`                                   |
| 4        | `fix-requests.md` exists                     | `resolve`                                      |
| 5        | PR exists (`gh pr view` exit 0)              | `review`                                       |
| 6        | otherwise                                    | `pr-create`                                    |

`--force` re-runs from `review` and discards the cached review state — pass it through so `cross-review` prepares a fresh state.

## Step 3 — Run the remaining stages

Execute every stage from the entry point through `revalidate`, in order, in the same turn.

Between `resolve` and `revalidate`, push the branch. `revalidate` re-measures a local delta and does not require the push, but the PR must reflect what was judged.

Stage outcomes that stop the pipeline:

| Stage        | Stop condition                                               |
| ------------ | ------------------------------------------------------------ |
| `pr-create`  | Any Stage 0 abort, or blocked document sync                  |
| `review`     | Verdict `INCONCLUSIVE` — evidence could not settle it        |
| `review`     | Verdict `APPROVED` — nothing to resolve; report and END      |
| `resolve`    | Typecheck failure under `--auto`                             |
| `revalidate` | Never stops the pipeline; its verdict is the pipeline result |

A stopped pipeline is resumable: re-run `/filid:pipeline` and Step 2 re-enters at the right stage.

## Terminal Output

```text
Pipeline: <entry stage> → <last stage>
Result: <verdict or stop reason>
```

## Options

| Option          | Type   | Default | Effect                                                   |
| --------------- | ------ | ------- | -------------------------------------------------------- |
| `--from STAGE`  | string | auto    | Entry stage: `pr-create`/`review`/`resolve`/`revalidate` |
| `--base REF`    | string | auto    | Base ref, forwarded to `pr-create` and `review`          |
| `--draft`       | flag   | off     | Forwarded to `pr-create`                                 |
| `--skip-enrich` | flag   | off     | Forwarded to `pr-create` — skips document sync           |
| `--force`       | flag   | off     | Restart the review from a fresh state                    |
| `--title TITLE` | string | auto    | Forwarded to `pr-create`                                 |

## Invariants

- The pipeline never calls an MCP tool other than `review_state`, and never edits a file.
- Stage order is fixed. `--from` selects an entry, never a reordering.
- `resolve` always runs with `--auto` here.
- The pipeline does not end at `resolve`. Reaching `resolve` and stopping is a defect, not a completion.
