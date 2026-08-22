# pipeline — Reference

## §1 Entry-point detection

`review_state({action: "assess"})` performs the detection and returns `summary.entryStage`. This table documents what it decides; it is not a probe sequence to run by hand. The **first** matching row wins.

| Priority | Probe                                 | `entryStage` |
| -------- | ------------------------------------- | ------------ |
| 1        | `REVIEW_DIR/re-validate.md` exists    | `complete`   |
| 2        | `REVIEW_DIR/justifications.md` exists | `revalidate` |
| 3        | `REVIEW_DIR/fix-requests.md` exists   | `resolve`    |
| 4        | `hasPullRequest` was passed as true   | `review`     |
| 5        | none of the above                     | `pr-create`  |

`complete` reports the recorded verdict and ends. Re-running a closed cycle requires `--from=review --force`.

Push state is a separate fact, not a stage: `summary.unpushedCommits` counts commits ahead of the upstream and is `null` when the branch has no upstream — never pushed. At the `revalidate` entry, push when that count is above zero or null.

`hasPullRequest` comes from the caller because filid owns no PR operations. Omitting it reads as "no PR", which sends a branch with an unreviewed PR to `pr-create` — pass it.

## §2 Resume rules

- Re-running `/filid:pipeline` after any stop is safe. Detection re-enters at the correct stage.
- `--from` overrides detection but never reorders the stages after it.
- `--force` applies to the review stage only: it makes `cross-review` prepare a fresh state rather than reusing a cached sealed one. It does not delete corrections already committed.
- A resumed run repeats `review_state(assess)`. It reads no state file, so a resumed run never reports a stale review as an error; the stages that do care — `resolve` and `revalidate` — run their own `checkpoint`.

## §3 Per-stage failure handling

**`pr-create`**

| Failure                    | Pipeline action                                               |
| -------------------------- | ------------------------------------------------------------- |
| Dirty **source** worktree  | Stop. Report the abort message verbatim.                      |
| Dirty generated paths only | Continue — `pr-create` classifies them and never stages them. |
| Document sync blocked      | Stop. Documents are the PR's precondition.                    |
| `gh` unauthenticated       | Continue — the body is saved locally; report the path.        |

Generated paths are the ones declared in `structure.generatedPaths`; the classification table is `pull-request/reference.md` §5. A build artifact left in the tree is not a reason to stop a cycle that has not started.

**`review`**

| Verdict           | Pipeline action                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------- |
| `APPROVED`        | Stop and report success. There is nothing to resolve.                                        |
| `REQUEST_CHANGES` | Continue to `resolve`.                                                                       |
| `INCONCLUSIVE`    | Stop. Evidence could not settle the question; a resolve run would act on unsettled findings. |

**`resolve`**

| Failure                      | Pipeline action                                   |
| ---------------------------- | ------------------------------------------------- |
| Typecheck failure (`--auto`) | Stop. The corrections left the tree uncompilable. |
| Accepted item `unapplied`    | Continue — `revalidate` fails it with evidence.   |

**`revalidate`**

Never stops the pipeline. Its verdict _is_ the pipeline result:

| Verdict        | Reported as                                     |
| -------------- | ----------------------------------------------- |
| `PASS`         | Cycle closed; review directory cleaned up       |
| `FAIL`         | Open findings remain; directory kept for resume |
| `INCONCLUSIVE` | Evidence unsettled; directory kept              |

## §4 Why the pipeline does not end at resolve

`resolve` finishes with a commit. A commit is the most convincing false terminal in this cycle: the tree is green, something was written, and the turn feels complete. Nothing has been verified at that point — `resolve` delegates corrections and does not measure whether they took.

The cycle closes only when `revalidate` re-measures the delta against `resolve_commit_sha` and issues a verdict. Stopping earlier reports a change as a resolution.

## §5 What this skill does not do

- It does not measure anything. Every finding comes from a stage.
- It does not edit files, and it calls no MCP tool other than `review_state`.
- It does not choose the resolve batch — it always passes `--auto`, which shows the decision sheet, preserves recommendations, auto-selects every decision, and opens no prompt. Use `/filid:resolve` directly for batch overrides and discussion.
