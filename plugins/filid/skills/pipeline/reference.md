# pipeline — Reference Documentation

Auto-detection details, flag passthrough, and inter-stage file contracts
for the pipeline orchestrator. The canonical stage alias table lives in
`SKILL.md` → "Stage Alias Table (SSoT)".

## Auto-Detection Algorithm

When `--from` is omitted, check signals in strict priority order — first
match wins.

```
1. Detect branch: git branch --show-current
2. Normalize: mcp__plugin_filid_t__review_manage(normalize-branch)
3. Set review_dir = .filid/review/<normalized>/

Signal 0 (spike harvest guard): branch matches spike/*?
  → YES: read .filid/harvest/<normalized>/manifest.json
    → missing / unparsable / head_sha != HEAD / created_at > 7 days:
      route to Skill("filid:harvest") — merge-track entry blocked.
      Only a current manifest lifts the guard.
    → current: continue to Signal 1.
  → NO: continue to Signal 1.

Signal 1: re-validate.md exists?
  → YES: pipeline already complete — report existing results. DONE.

Signal 2: justifications.md exists?
  → YES: check unpushed commits (git log @{upstream}..HEAD --oneline)
    → has unpushed: git push, then start from REVALIDATE
    → all pushed: start from REVALIDATE
    → no upstream tracking ref (command fails): skip push, start from
      REVALIDATE — do not attempt git push -u
    → push fails: pipeline ERROR — report and END (after a manual push,
      re-run /filid:pipeline or use --from=revalidate)

Signal 3: fix-requests.md exists?
  → YES: grep for "Type: harvest-required"
    → present: do NOT start resolve (its harvest gate would abort and
      the pipeline would loop). Report the oracle work required and END.
    → absent: start from RESOLVE.

Signal 4: does a PR exist? (gh pr view exit code)
  → exit 0: start from REVIEW
  → non-zero: start from PR-CREATE
```

### Edge Cases

| Condition                                  | Behavior                                                              |
| ------------------------------------------ | --------------------------------------------------------------------- |
| Spike branch, manifest stale (new commits) | Signal 0 routes back to `filid:harvest` — incremental re-harvest      |
| Spike branch, `--from` given               | Rejected while no current manifest exists — `--from` cannot bypass it |
| Branch has no upstream tracking ref        | Skip push, start from revalidate directly                             |
| `gh` CLI not authenticated                 | Signal 4 fails → default to `pr-create` (fails there with auth error) |
| Review directory does not exist            | All file checks false → falls through to Signal 4                     |

## Flag Passthrough Matrix

| Flag            | pr-create | review | resolve | revalidate |
| --------------- | --------- | ------ | ------- | ---------- |
| `--base`        | ✓         | ✓      |         |            |
| `--draft`       | ✓         |        |         |            |
| `--skip-update` | ✓         |        |         |            |
| `--title`       | ✓         |        |         |            |
| `--force`       |           | ✓      |         |            |
| `--auto`        |           |        | always  |            |

> `--auto` is **always** passed to resolve regardless of user input —
> the pipeline implies full automation for the resolve stage.

## Inter-Stage File Contracts

All paths relative to `.filid/review/<normalized>/`.

| Stage      | Writes                                                                                                                              | Reads (requires)                                           | Success signal             |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------- |
| pr-create  | _(GitHub PR only)_                                                                                                                  | git state                                                  | skill completes            |
| review     | `session.md`, `verification.md`, `opinions/*.md`, `review-report.md`, `fix-requests.md` (blocking), `content-hash.json`, PR comment | git diff                                                   | `review-report.md` exists  |
| resolve    | `justifications.md`, `.filid/debt/*.md` (rejections), commit + push                                                                 | `fix-requests.md`                                          | `justifications.md` exists |
| revalidate | `re-validate.md`, PR comment                                                                                                        | `justifications.md`, `fix-requests.md`, `review-report.md` | `re-validate.md` exists    |

The review stage's verdict is read from `review-report.md` frontmatter
(`verdict:`); a missing field is treated as `INCONCLUSIVE`.

## Stage Transition Table

| #   | Situation                       | Next action                                 |
| --- | ------------------------------- | ------------------------------------------- |
| 1   | pr-create succeeds              | Proceed to review                           |
| 2   | review → `APPROVED`             | Pipeline **PASS** (skip resolve+revalidate) |
| 3   | review → `REQUEST_CHANGES`      | Proceed to resolve                          |
| 4   | review → `INCONCLUSIVE`         | Pipeline **FAIL** (skip resolve+revalidate) |
| 5   | resolve → 0 or N accepted fixes | Proceed to revalidate                       |
| 6   | revalidate → `PASS`             | Pipeline **PASS**                           |
| 7   | revalidate → `FAIL`             | Pipeline **FAIL** (report unresolved)       |
| 8   | Any stage execution error       | Pipeline **ERROR** (report + resume cmd)    |
| 9   | `--from` prerequisite missing   | Pipeline **ABORT** (before execution)       |

## Example Run

```
$ /filid:pipeline --from=pr-create --base=main --draft

[1/4] pr-create   → Skill("filid:pull-request", "--base=main --draft")
                  → PR #42 created (draft) ✓
[2/4] review      → Skill("filid:cross-review", "--scope=pr --base=main")
                  → evidence + 4-persona committee + verification
                  → Review verdict: REQUEST_CHANGES (5 fix items) ✓
[3/4] resolve     → Skill("filid:resolve", "--auto")
                  → 5/5 fixes applied, typecheck PASS, committed + pushed ✓
[4/4] revalidate  → Skill("filid:revalidate")
                  → Verdict: PASS (5/5 resolved) → session cleaned up ✓

Pipeline PASS — all stages completed successfully.
```
