# pipeline — Reference Documentation

Detailed reference for the pipeline orchestrator skill, including
auto-detection algorithm, flag passthrough, file contracts, and
stage execution patterns.

> **Canonical stage alias table**: see `stages.md` in this directory for
> the SSoT mapping between stage aliases (`pr-create`, `review`, `resolve`,
> `revalidate`) and the skills they delegate to. The bare-word token policy
> for action/type/stage tokens is also defined there.

## Auto-Detection Algorithm

When `--from` is omitted, the pipeline determines the entry point by
checking signals in strict priority order. First match wins.

```
1. Detect branch: git branch --show-current
2. Normalize: mcp_t_review_manage(normalize-branch)
3. Set review_dir = .filid/review/<normalized>/

Check signals:

  Signal 1: Does <review_dir>/re-validate.md exist?
    → YES: Pipeline already complete. Read and report existing results. DONE.
    → NO:  Continue to Signal 2.

  Signal 2: Does <review_dir>/justifications.md exist?
    → YES: Check unpushed commits: git log @{upstream}..HEAD --oneline
      → Has unpushed: Push first (git push), then start from REVALIDATE.
      → All pushed: Start from REVALIDATE.
      → No upstream tracking ref (command fails): Skip push, start from REVALIDATE.
      → Push fails: Pipeline ERROR — report failure and END.
    → NO:  Continue to Signal 3.

  Signal 3: Does <review_dir>/fix-requests.md exist?
    → YES: Start from RESOLVE.
    → NO:  Continue to Signal 4.

  Signal 4: Does a PR exist for this branch?
    → Check: gh pr view (exit code)
    → Exit 0 (PR exists): Start from REVIEW.
    → Non-zero (no PR):   Start from PR-CREATE.
```

### Edge Cases

| Condition | Behavior |
| --------- | -------- |
| Branch has no upstream tracking ref | `git log @{upstream}..HEAD` fails → skip push, start from revalidate directly |
| `gh` CLI not authenticated | Signal 4 fails → default to `pr-create` (will fail at PR creation stage with auth error) |
| Review directory does not exist | All file checks return false → falls through to Signal 4 |
| Multiple review directories | Only `<normalized>` branch directory is checked — other branches are ignored |

## Flag Passthrough Matrix

Flags provided to `filid:pipeline` are forwarded to the appropriate stage.
Unrecognized flags are ignored.

| Flag                   | pr-create | review | resolve | revalidate |
| ---------------------- | --------- | ------ | ------- | ---------- |
| `--base`               | ✓         | ✓      |         |            |
| `--draft`              | ✓         |        |         |            |
| `--skip-update`        | ✓         |        |         |            |
| `--title`              | ✓         |        |         |            |
| `--force`              |           | ✓      |         |            |
| `--no-structure-check` |           | ✓      |         |            |
| `--auto`               |           |        | always  |            |

> `--auto` is **always** passed to resolve regardless of user input.
> The pipeline implies full automation for the resolve stage.

## Inter-Stage File Contracts

Each stage reads and writes specific files in `.filid/review/<branch>/`.
These files serve as the inter-stage communication interface.

### Files Written by Each Stage

| Stage                    | Files written                                              |
| ------------------------ | ---------------------------------------------------------- |
| pr-create                | _(none in review dir — creates GitHub PR)_                 |
| review — A/B/C subagent  | `structure-check.md` (if Phase A ran), `session.md`, `verification-metrics.md`, `verification-structure.md` |
| review — Phase D + finalize (main) | `verification.md` (merged), `rounds/round-<N>-<persona>.md` (team) or `rounds/round-1-adjudicator.md` (solo) or `rounds/failure.md` (fail), `review-report.md`, `fix-requests.md` (team/solo non-approved paths only), `content-hash.json`, PR comment (via `gh pr comment` / edit-in-place) |
| resolve                  | `justifications.md`, `.filid/debt/*.md` (if rejections)    |
| revalidate               | `re-validate.md`                                           |

> Fail dispatch path: `rounds/failure.md` **and** a minimal `review-report.md`
> (Failure Variant template in `review/templates.md`) are both written
> so `mcp_t_review_manage(format-pr-comment)` and the verdict decision step
> have a consistent frontmatter to read. `fix-requests.md` is NOT written on
> the fail path.

### Files Read by Each Stage

| Stage       | Files required                                             |
| ----------- | ---------------------------------------------------------- |
| pr-create   | _(reads git state only)_                                   |
| review      | _(reads git diff)_                                         |
| resolve     | `fix-requests.md`                                          |
| revalidate  | `justifications.md`, `fix-requests.md`, `review-report.md` |

### Stage Success Signals

| Stage       | Success signal                                             |
| ----------- | ---------------------------------------------------------- |
| pr-create   | Skill completes without error                              |
| review — A/B/C subagent | Subagent emits fenced `SubagentReturn` YAML block on exit; referenced artifacts (`session.md`, `verification-metrics.md`, `verification-structure.md`) exist on disk |
| review — Phase D + finalize (main) | `review-report.md` exists (standard or Failure Variant frontmatter), `content-hash.json` written, PR comment posted/edited (Step 5, `--scope=pr` only) |
| resolve     | `justifications.md` exists                                 |
| revalidate  | `re-validate.md` exists                                    |

## `--from` Prerequisite Matrix

Before starting at a given stage, the pipeline verifies that required
artifacts from previous stages exist.

| `--from` value  | Required artifacts                           | Check method                |
| --------------- | -------------------------------------------- | --------------------------- |
| `pr-create`     | _(none)_                                     | —                           |
| `review`        | GitHub PR exists                             | `gh pr view` exit code 0    |
| `resolve`       | `fix-requests.md` in review dir              | File existence check        |
| `revalidate`    | `justifications.md` in review dir            | File existence check        |

## Stage Transition Table

Complete enumeration of stage outcomes and pipeline behavior.

| #  | Situation                              | Next action                              |
| -- | -------------------------------------- | ---------------------------------------- |
| 1  | pr-create succeeds                     | Proceed to review                        |
| 2  | review → `APPROVED` (no fix-requests)  | Pipeline **PASS** (skip resolve+revalidate) |
| 3  | review → `REQUEST_CHANGES`             | Proceed to resolve                       |
| 4  | resolve → 0 accepted fixes             | Proceed to revalidate                    |
| 5  | resolve → N accepted fixes             | Proceed to revalidate                    |
| 6  | revalidate → `PASS`                    | Pipeline **PASS**                        |
| 7  | revalidate → `FAIL`                    | Pipeline **FAIL** (report unresolved)    |
| 8  | Any stage execution error              | Pipeline **ERROR** (report + resume cmd) |
| 9  | `--from` prerequisite missing          | Pipeline **ABORT** (before execution)    |

## Stage Execution Pattern

The pipeline uses a **hybrid execution model** to balance context isolation
with delegation reliability.

### Execution Modes

| Stage       | Mode         | Reason                                                    |
| ----------- | ------------ | --------------------------------------------------------- |
| pr-create   | Main context | Lightweight, procedural — direct `Skill()` is reliable    |
| review — A/B/C | Subagent  | ~100k tokens — must isolate to prevent main context bloat. Subagent MUST NOT run Phase D (nested TeamCreate leaks orphan workers). Exits with `SubagentReturn` YAML. |
| review — Phase D + finalize | Main context | Phase D requires main-context team orchestration (`TeamCreate`/solo `Task`). Finalize (content-hash + PR comment) reads from `review-report.md` frontmatter. |
| resolve     | Main context | Procedural with internal subagents (code-surgeon)         |
| revalidate  | Main context | Lightweight with internal subagents (parallel verifiers)  |

### Pseudocode

The review stage is split: Phase A/B/C runs inside a `general-purpose`
subagent via `Skill("filid:review", "--pipeline-mode=abc-only ...")`,
then Phase D + finalize (Step 4.5 content-hash, Step 5 PR comment) run in
the pipeline main. The subagent MUST NOT call `TeamCreate` internally —
nested Phase D from a subagent leaks orphan workers and violates the
`verdict_gate` contract.

```
For each stage in pipeline:

  if stage == "review":
    # Subagent delegation — A/B/C only, context isolation required
    subagent_output = Agent(
      subagent_type: "general-purpose",
      prompt: "Read and execute the following skill:
               Skill('filid:review', '--scope=pr --pipeline-mode=abc-only <flags>').
               Project root: <project_root>. Branch: <branch>.
               CRITICAL: This is PIPELINE SUBAGENT MODE. You MUST stop after
               Phase C (Step 3) completes. Do NOT execute Phase D, Step 4.5
               (content-hash), or Step 5 (PR comment) — those run in the
               pipeline main after you return. Your terminal output MUST
               be a fenced YAML block containing the SubagentReturn contract
               (committee, deliberation_mode, failure_reason,
               paths_to_artifacts) as specified in
               packages/filid/skills/review/DETAIL.md (## API Contracts).",
      description: "FCA review stage — Phase A/B/C only (context isolation)"
    )

    # Main-side Phase D dispatch + finalize
    return_payload = parse_fenced_yaml(subagent_output, "SubagentReturn")
    verify_artifacts_exist(return_payload.paths_to_artifacts)
    dispatch = apply_verdict_gate(
      return_payload.deliberation_mode,
      return_payload.failure_reason,
      return_payload.committee
    )  # → "team" | "solo" | "fail" per DETAIL.md verdict_gate
    execute_phase_d(dispatch, return_payload)  # team / solo / fail branch
    mcp_t_review_manage("content-hash", ...)    # Step 4.5 in main
    if --scope=pr:
      post_or_edit_pr_comment(...)              # Step 5 in main
    decide_next_stage(verdict)                   # APPROVED|REQUEST_CHANGES|INCONCLUSIVE

  else:
    # Main context execution — direct Skill() call
    Skill("filid:<skill-name>", "<flags>")

  if failure:
    Report: "Pipeline ERROR at stage <stage-name>: <error>"
    Report: "Resume with: /filid:pipeline --from=<stage-name>"
    STOP pipeline.

  Verify success signal (file existence check).
  Proceed to next stage.
```

### Why Hybrid Execution?

1. **Context isolation for review**: The review stage consumes ~100k tokens
   (multi-persona consensus with 5+ tool-heavy phases). Running it in the
   main context would risk compaction and degraded output quality.
2. **Reliable execution for procedural stages**: `filid:resolve` and `filid:revalidate`
   are sequential, procedural workflows that spawn their own internal
   subagents (code-surgeon, parallel verifiers). Wrapping them in a
   pipeline-level subagent creates a fragile three-level nesting chain
   (pipeline Agent → stage subagent → Skill() → internal subagents) that
   causes `"summary is required when message is a string"` errors and
   premature termination.
3. **Skill reuse**: All stages invoke existing skills via `Skill()` — the
   same code path as standalone skill execution, regardless of execution mode.

> **Note**: "Main context execution" eliminates only the *pipeline-level*
> subagent wrapper. Skills that internally spawn subagents (e.g., resolve's
> code-surgeon, revalidate's parallel verifiers) continue to do so normally.

## Example Pipeline Run

```
$ /filid:pipeline --from=pr-create --base=main --draft

[1/4] pr-create (main context)
  → Skill("filid:pull-request", "--base=main --draft")
  → PR #42 created (draft)
  ✓ Success

[2/4] review — A/B/C (subagent)
  → Agent(general-purpose) → Skill("filid:review",
      "--scope=pr --pipeline-mode=abc-only --base=main")
  → SubagentReturn: { committee: [engineering-architect, ...],
      deliberation_mode: team, failure_reason: none, paths_to_artifacts: {...} }
  ✓ session.md, verification-metrics.md, verification-structure.md verified

[2/4] review — Phase D + finalize (main)
  → verdict_gate(team, none) → dispatch: team
  → TeamCreate(review-<branch>) + 4 persona Tasks, 2 rounds → SYNTHESIS
  → TeamDelete (try/finally)
  → Verdict: REQUEST_CHANGES (5 fix items)
  → mcp_t_review_manage(content-hash) + gh pr comment
  ✓ review-report.md, fix-requests.md, content-hash.json written

[3/4] resolve (main context)
  → Skill("filid:resolve", "--auto")
  → 5/5 fixes accepted, typecheck PASS
  → Committed: fix(filid): resolve FIX-001, FIX-002, FIX-003, FIX-004, FIX-005 from review
  → Pushed to origin
  ✓ justifications.md written

[4/4] revalidate (main context)
  → Skill("filid:revalidate")
  → Verdict: PASS (5/5 resolved, 0 unconstitutional)
  → PR comment posted
  ✓ re-validate.md written → session cleaned up

Pipeline PASS — all stages completed successfully.
```
