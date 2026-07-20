---
name: pipeline
user_invocable: true
description: '[filid:pipeline] Orchestrate the full FCA review cycle from PR creation to final verdict by chaining pr-create, review, resolve, and revalidate stages with automatic entry point detection and --from resume support.'
argument-hint: '[--from STAGE] [--base REF] [--draft] [--skip-update] [--force] [--title TITLE]'
version: '2.0.1'
complexity: medium
plugin: filid
---

> **EXECUTION MODEL (Tier-1 Anti-Yield)**: Execute all stages as a SINGLE
> CONTINUOUS OPERATION. After each stage completes, IMMEDIATELY verify its
> success signal and invoke the next stage in the same response. NEVER
> yield after a `Skill()` completion or MCP tool call. On error, report
> it and END — do not ask for confirmation.
>
> **HIGH-RISK YIELD POINT**: the resolve → revalidate transition is where
> pipelines most commonly stall. Resolve ends with commit + push, which
> FEELS like completion but IS NOT. You MUST invoke
> `Skill("filid:revalidate")` immediately after resolve succeeds.

# pipeline — End-to-End Review Pipeline

Orchestrate the full FCA review cycle in a single command. The pipeline
is a pure orchestrator: every stage executes **directly in the main
context** via `Skill()` — skills that internally spawn subagents
(cross-review's evidence/committee/verifier agents, resolve's
code-surgeon, revalidate's parallel verifiers) continue to do so
themselves. Stages communicate via `.filid/review/<branch>/` files.

> **References**: `reference.md` (auto-detection edge cases, flag
> passthrough matrix, inter-stage file contracts).

## When to Use

- Full review cycle from PR creation to final verdict
- When you want a single command instead of 4 sequential skill invocations
- When `--auto` resolve is acceptable (the pipeline always resolves with `--auto`)

## Stage Alias Table (SSoT)

Canonical mapping between stage aliases and skills. Stage aliases,
`--from` values, fix-request `Type:` tokens, and `debt_manage` actions
are **bare lowercase words** — never `filid:`-prefixed. The `filid:`
form is used only as the first argument of `Skill()`.

| Stage alias  | Skill invocation                                    | Entry prerequisite                                |
| ------------ | --------------------------------------------------- | ------------------------------------------------- |
| `pr-create`  | `Skill("filid:pull-request", "<flags>")`            | None                                              |
| `review`     | `Skill("filid:cross-review", "--scope=pr <flags>")` | PR exists (`gh pr view` exit 0)                   |
| `resolve`    | `Skill("filid:resolve", "--auto")`                  | `.filid/review/<branch>/fix-requests.md` exists   |
| `revalidate` | `Skill("filid:revalidate")`                         | `.filid/review/<branch>/justifications.md` exists |

Always use the two-argument form — `Skill("filid:<name>", "<args>")` —
never a single string with embedded flags.

```
pr-create → review → resolve → revalidate
```

## Core Workflow

### Step 1 — Determine Entry Point

Detect the branch (`git branch --show-current`), normalize it
(`mcp__plugin_filid_tools__review_manage(action: "normalize-branch", ...)`),
set `review_dir = .filid/review/<normalized>/`.

> **Spike harvest guard (precedes `--from` and auto-detection)**: if the
> branch matches `spike/*`, read
> `.filid/harvest/<normalized>/manifest.json`. When it is missing, stale
> (`head_sha` != `git rev-parse HEAD`), or expired (`created_at` > 7
> days), the merge track is closed: reject any `--from` value and, in
> auto-detection, invoke `Skill("filid:harvest")` instead of entering
> any stage (the harvest interview is interactive — yielding there is
> its sanctioned escape hatch). Only a current manifest lifts this
> guard. When current, proceed normally.

**If `--from` is specified**: validate the prerequisite from the Stage
Alias Table; if missing, **ABORT** with "Cannot start from `<stage>`:
`<missing condition>`. Run the preceding stage first." and END.

**If `--from` is omitted**, check signals in priority order — first
match wins:

| Priority | Signal                                        | Entry                                                                                |
| -------- | --------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1        | `re-validate.md` exists                       | Pipeline **complete** — report existing results (redo: `--from=review --force`), END |
| 2        | `justifications.md` exists + unpushed commits | `git push`, then `revalidate` (details in `reference.md`)                            |
| 3        | `justifications.md` exists (all pushed)       | `revalidate`                                                                         |
| 4        | `fix-requests.md` exists                      | `resolve` — unless it contains `Type: harvest-required` (below)                      |
| 5        | None of the above → `gh pr view` (Bash)       | `review` if a PR exists, `pr-create` if not                                          |

**Priority 4 guard**: Grep `fix-requests.md` for
`Type: harvest-required`. If present, do NOT invoke resolve (its
harvest gate would abort and re-running would loop): report that oracle
work is required — spike branch → `/filid:harvest`; merge-track
INSUFFICIENT-EVIDENCE claims → supply the claim's `observable` evidence
or a human-confirmed claim revision, then
`/filid:cross-review --force` — and END.

**→ After the entry point is determined, immediately proceed to Step 2. Do NOT pause or summarize the detection result.**

### Step 2 — Execute Stages

Run stages sequentially from the entry point. For each stage: invoke the
skill, verify the success signal (file existence), then chain the next
stage in the same response.

#### Stage: pr-create

- **Pre-check**: if `gh pr list --head <branch> --state open` returns a
  PR, skip to the review stage.
- **Execute**: `Skill("filid:pull-request", "<forward: --base --draft --skip-update --title>")`
- **Success signal**: a PR URL is emitted (an existing PR found by the
  pre-check counts).
- **Failure**: any ending without a PR URL — an abort, or the
  Manual-PR/local-draft ending when `gh` is unauthenticated. Relay the
  skill's own instructions and END with "PR creation failed: `<reason>`".
- **→ Immediately proceed to the review stage.**

#### Stage: review

- **Execute**: `Skill("filid:cross-review", "--scope=pr <forward: --base --force>")`
  — the review skill runs its whole flow (evidence, committee,
  verification, report, content-hash, PR comment) and emits
  `Review verdict: <VERDICT>`.
- **Success signal**: `review-report.md` exists in `review_dir`.
- **Verdict branch** (grep `verdict:` from `review-report.md`
  frontmatter; missing → treat as INCONCLUSIVE):
  - **APPROVED** → skip resolve + revalidate. cross-review removes any
    leftover `fix-requests.md` itself; if one somehow remains, delete
    it (it would misroute the next auto-detection into resolve). Report
    "Review approved — no fixes needed." Pipeline **PASS**, END.
  - **INCONCLUSIVE** → skip resolve + revalidate. Pipeline **FAIL** —
    report "Review inconclusive. Inspect
    `.filid/review/<branch>/review-report.md` and re-run
    `/filid:pipeline --from=review --force`." END.
  - **REQUEST_CHANGES** → `fix-requests.md` exists;
    **→ immediately invoke `Skill("filid:resolve", "--auto")` in the same response.**

#### Stage: resolve

- **Execute**: `Skill("filid:resolve", "--auto")` — `--auto` is ALWAYS
  passed (the pipeline implies full automation; every interactive gate
  inside resolve is skipped by design).
- **Design-intent caveat**: `--auto` applies every fix, including
  schema / contract / API changes a module marks "Ask first". PASS
  attests rules + tests, not design fit — review auto-applied contract
  changes before merge.
- **Success signal**: `justifications.md` exists (also on the
  zero-accepted-fixes path).
- **Failure**: END with "Resolve failed: `<error>`"

> **⚠️ DO NOT STOP HERE**: resolve's commit + push is NOT the end of the
> pipeline. **→ Immediately invoke `Skill("filid:revalidate")` after
> confirming `justifications.md` exists. Do NOT output any text without
> a tool call.**

#### Stage: revalidate

- **Execute**: `Skill("filid:revalidate")`
- **Success signal**: `re-validate.md` exists
- **Failure**: END with "Revalidate failed: `<error>`"
- **→ Immediately proceed to Step 3.**

### Step 3 — Report Results

Read the final verdict from `re-validate.md` (or the last completed
stage's output) and report:

- **PASS** — all stages completed, revalidate verdict PASS. END.
- **FAIL** — report which stage's verdict was FAIL and the reason
  (distinct from a stage execution error). END.
- **ERROR** — report the failed stage, the error, and the resume
  command: `/filid:pipeline --from=<stage>`. END.

**After reporting results, execution is COMPLETE. Do not ask follow-up questions.**

## Failure Handling

| Situation                        | Pipeline behavior                                                          |
| -------------------------------- | -------------------------------------------------------------------------- |
| review `APPROVED`                | Skip resolve + revalidate → **PASS**, END                                  |
| review `REQUEST_CHANGES`         | Proceed to resolve immediately                                             |
| review `INCONCLUSIVE`            | Skip resolve + revalidate → **FAIL**, suggest `--from=review --force`, END |
| resolve completes (0 or N fixes) | Proceed to revalidate immediately                                          |
| revalidate `PASS` / `FAIL`       | Pipeline **PASS** / **FAIL**, report, END                                  |
| Priority-2 `git push` fails      | **ERROR** — report push error + manual instructions, END                   |
| Any stage execution error        | **ERROR** — report stage + error + resume command, END                     |
| `--from` prerequisite missing    | **ABORT** before execution, END                                            |

On any failure the pipeline stops immediately; re-running
`/filid:pipeline` auto-detects and resumes from the right stage.

## Options

> Options are LLM-interpreted hints, not strict CLI flags. Natural
> language works equally well.

| Option          | Type   | Default | Description                                                 |
| --------------- | ------ | ------- | ----------------------------------------------------------- |
| `--from`        | string | auto    | Entry stage: `pr-create`, `review`, `resolve`, `revalidate` |
| `--base`        | string | auto    | Base branch (forwarded to pr-create and review)             |
| `--draft`       | flag   | off     | Create PR as draft (pr-create)                              |
| `--skip-update` | flag   | off     | Skip the update sync inside pr-create                       |
| `--force`       | flag   | off     | Force-restart the review (forwarded to review)              |
| `--title`       | string | auto    | PR title (pr-create)                                        |

## Quick Reference

```
/filid:pipeline                    # Auto-detect entry point, run to completion
/filid:pipeline --from=review      # review → resolve → revalidate
/filid:pipeline --from=resolve     # resolve → revalidate

Pipeline: [pr-create] → [review] → [resolve --auto] → [revalidate]
Execution: every stage = direct Skill() in the main context
Files:     .filid/review/<branch>/ (inter-stage communication)
Resume:    re-run /filid:pipeline — auto-detection resumes at the right stage
```
