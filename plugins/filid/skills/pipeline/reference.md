# pipeline — Reference

## §1 Entry-point detection

Detection reads `REVIEW_DIR` — obtained from `review_state`, never derived — and the PR state. The **first** matching row wins; do not evaluate further rows.

| Priority | Probe                                               | Meaning                                      |
| -------- | --------------------------------------------------- | -------------------------------------------- |
| 1        | `REVIEW_DIR/re-validate.md` exists                  | The cycle already closed                     |
| 2        | `REVIEW_DIR/justifications.md` + unpushed commits   | Corrections landed but are not on the remote |
| 3        | `REVIEW_DIR/justifications.md`, working tree pushed | Ready to judge                               |
| 4        | `REVIEW_DIR/fix-requests.md` exists                 | A review demanded changes                    |
| 5        | `gh pr view` exit 0                                 | A PR exists but has no review                |
| 6        | none of the above                                   | No PR yet                                    |

Row 1 reports the recorded verdict and ends. Re-running a closed cycle requires `--from=review --force`.

Unpushed detection: `git rev-list --count @{upstream}..HEAD`. No upstream means the branch was never pushed — treat as unpushed.

## §2 Resume rules

- Re-running `/filid:pipeline` after any stop is safe. Detection re-enters at the correct stage.
- `--from` overrides detection but never reorders the stages after it.
- `--force` applies to the review stage only: it makes `cross-review` prepare a fresh state rather than reusing a cached sealed one. It does not delete corrections already committed.
- A resumed run repeats `review_state(checkpoint)` — a `stale` disposition after corrections is expected, not an error.

## §3 Per-stage failure handling

**`pr-create`**

| Failure                     | Pipeline action                                        |
| --------------------------- | ------------------------------------------------------ |
| Dirty non-document worktree | Stop. Report the abort message verbatim.               |
| Document sync blocked       | Stop. Documents are the PR's precondition.             |
| `gh` unauthenticated        | Continue — the body is saved locally; report the path. |

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
- It does not choose per-item accept/reject — it always passes `--auto`. Use `/filid:resolve` directly for per-item decisions.
