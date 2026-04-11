---
name: filid-review
user_invocable: true
description: "[filid:filid-review] Run multi-persona consensus code review governance: structure check (Phase A), analysis & committee election (Phase B), parallel technical verification (Phase C1 metrics + C2 structure), then Phase D political consensus executed as a real Claude Code team (committee.length >= 2) or a single Task (committee.length == 1)."
argument-hint: "[--scope branch|pr|commit] [--base REF] [--force] [--verbose] [--no-structure-check] [--solo]"
version: "2.0.0"
complexity: complex
plugin: filid
---

> **EXECUTION MODEL (Tier-2a Anti-Yield)**: Execute all steps as a SINGLE
> CONTINUOUS OPERATION. After each step/phase completes, IMMEDIATELY chain
> the next tool call in the same response. NEVER yield the turn after
> subagent results return, MCP tools complete, or team messages arrive.
> Checkpoint resume decisions are internal — do NOT ask the user which
> phase to start from. Large subagent outputs and round opinion files are
> internal working data — do NOT summarize them to the user mid-execution.
>
> **Valid reasons to yield**:
> 1. User decision genuinely required (unrecoverable error only)
> 2. Terminal stage marker emitted: `Review verdict: (APPROVED|REQUEST_CHANGES|INCONCLUSIVE)`
>    — after `review-report.md` + `fix-requests.md` are written, Step 4.5
>    content-hash is persisted, and any Phase D team has been deleted.
>
> **HIGH-RISK YIELD POINTS** (strengthen vigilance here):
> 1. After Phase A/B background tasks complete → chain Step 3 immediately.
> 2. After Phase C1/C2 background tasks complete → chain verification.md
>    merge + Phase D immediately.
> 3. After TeamCreate + worker spawns return → chain round monitoring
>    immediately; do not pause between spawn and wait.
> 4. Between deliberation rounds → parse opinion frontmatter and create
>    Round N+1 tasks without yielding.
> 5. After TeamDelete → chain Step 4.5 (content-hash) immediately.
> 6. After Step 4.5 content-hash persistence → chain Step 5 (PR comment)
>    in the same response; emit the terminal verdict marker only after
>    Step 5 completes or is skipped.

# filid-review — AI Code Review Governance

Execute the multi-persona consensus-based code review governance pipeline.
The chairperson delegates Phase A (structure check), Phase B (analysis &
committee election), and Phase C (technical verification) to subagents, then
directly conducts Phase D (political consensus) using elected committee personas
and a state machine.

> **References**: `state-machine.md` (deliberation rules), `reference.md`
> (output templates, Opinion Frontmatter Contract, MCP tool map, committee
> → agent mapping), `phases/phase-d-deliberation.md` (Team orchestration
> with solo / team size branch), `packages/filid/agents/<persona-id>.md`
> (real subagent definitions spawned as Phase D team workers).

## When to Use

- Before merging PRs requiring multi-perspective governance review
- When changes span multiple fractals or modify interfaces
- To generate structured fix requests with severity ratings and code patches
- When technical debt may influence review strictness

## Core Workflow

### Step 1 — Branch Detection & Checkpoint Resume

1. Detect branch: `git branch --show-current` (Bash)
2. Normalize: `review_manage(action: "normalize-branch", projectRoot: <project_root>, branchName: <branch>)` MCP tool
3. Check checkpoint: `review_manage(action: "checkpoint", projectRoot: <project_root>, branchName: <branch>)` MCP tool
4. Resume logic:
   - No checkpoint files → Phase A (unless `--no-structure-check`, then Phase B)
   - `structure-check.md` only → Phase B
   - `session.md` only → Check `session.md` frontmatter for `no_structure_check` flag:
     - If `no_structure_check: true` → Phase C (Phase A was intentionally skipped)
     - If `no_structure_check: false` or absent → Phase A only (Phase A likely failed while Phase B succeeded in parallel; preserve existing `session.md`, **increment `resume_attempts` by 1 in session.md frontmatter** using Edit tool: Read the session.md file, locate the `resume_attempts: <N>` line in the frontmatter (between `---` markers), then `Edit(old_string: 'resume_attempts: <N>', new_string: 'resume_attempts: <N+1>')`. If the field is absent, add `resume_attempts: 1` inside the frontmatter by editing between the `---` markers. Then restart only Phase A)
     After Phase A completes and writes `structure-check.md`, re-evaluate the checkpoint state against the full table above to determine the next phase (typically Phase C).
   - `structure-check.md` + `session.md` (no `verification.md`) → Phase C
   - `session.md` + `verification.md` → Phase D
   - All complete (`review-report.md` exists) → "Review complete"

> **Max-retry guard (LOGIC-011)**: When the checkpoint response has `resumeExhausted: true` (`resume_attempts >= 3`), the skill MUST terminate with verdict `INCONCLUSIVE` instead of restarting Phase A. Report: "Resume exhausted after 3 Phase A retries — manual intervention required. Inspect `.filid/review/<branch>/session.md` and re-run with `--force` to start fresh." Then END execution. Do not enter any further phase.

If `--force`: call `review_manage(action: "cleanup", projectRoot: <project_root>, branchName: <branch>)` first, then restart from Phase A (or Phase B if `--no-structure-check`).

5. Cache check (skip when `--force` is set or when no prior review exists):
   Call: `review_manage(action: "check-cache", projectRoot: <project_root>, branchName: <branch>, baseRef: <base_ref>)`
   Follow the `action` field in the response:
   - `"skip-to-existing-results"`: Read and output existing `review-report.md` and `fix-requests.md` from the paths in the response. Done.
   - `"proceed-full-review"`: Continue to Step 2 as normal.

**→ After entry point is determined, immediately proceed to Step 2.**

### Step 2 — Phase A + B: Parallel Delegation

> Phase A and Phase B are independent and run **in parallel** as separate Task
> subagents. Phase A is skipped when `--no-structure-check` is set; in that
> case only Phase B runs.

> Uses `general-purpose` subagent type (not filid agents) because these phases perform broad analysis that benefits from unrestricted tool access.

#### Phase A batch partitioning (context budget control)

Before spawning Phase A, inspect the git diff file count
(`git diff <BASE_REF>..HEAD --name-only | wc -l`):

| Changed files | Phase A strategy |
| ------------- | ---------------- |
| `<= 15`       | Single subagent (current behavior) |
| `> 15`        | Partition changed files into 10-file batches. Spawn one Phase A subagent per batch in parallel. Each subagent writes `structure-check.partial-<batchId>.md`. After all batches complete, the chairperson merges partial files into the final `structure-check.md` (deduplicate findings by `path+rule`, sum `critical_count`). |

Each batched subagent receives its batch file list in the `Context` block:

```
Context:
- REVIEW_DIR: <actual review dir>
- PROJECT_ROOT: <actual project root>
- BASE_REF: <actual base ref>
- BRANCH: <actual branch>
- BATCH_ID: <integer or empty>
- BATCH_FILES: <newline-separated file paths or empty>
  # If BATCH_ID is set, operate ONLY on these files. Write output to
  # structure-check.partial-<BATCH_ID>.md instead of structure-check.md.
```

The Phase A instructions file (`phase-a-structure.md`) already enforces
streaming-write discipline, so each batch worker stays within budget.

#### Subagent Prompt Construction Rules

When constructing subagent prompts, follow these rules to ensure reliable output:

1. **State the output file first**: The prompt MUST begin with the mandatory output
   file path and format. Example: "Your PRIMARY DELIVERABLE is writing
   `<REVIEW_DIR>/structure-check.md`. You MUST write this file before completing."
2. **Provide concrete context values**: Substitute all variables (`REVIEW_DIR`,
   `PROJECT_ROOT`, `BASE_REF`, `BRANCH`) with actual values — never pass variable
   names for the subagent to resolve.
3. **Include the phase file path**: Tell the subagent to read the phase instructions
   file, then provide the resolved path. Example: "Read and follow the instructions
   in `/absolute/path/to/phase-a-structure.md`."
4. **Reinforce the output at the end**: Close the prompt with a reminder: "REMINDER:
   Write `<output_file>` before you finish. If you run low on budget, skip remaining
   analysis and write the file with partial results."
5. **Pass the language setting**: Include a language instruction in every subagent
   prompt using the `[filid:lang]` tag from system context (e.g., `[filid:lang] ko`).
   If no tag is present, follow the system's language setting; default to English.
   This ensures output files (structure-check.md, session.md, verification.md,
   review-report.md, fix-requests.md) are written in the configured language.
   Technical terms, code identifiers, rule IDs, and file paths remain in original form.

**Phase A: Structure Pre-Check** (`general-purpose`, model: `sonnet`,
`run_in_background: true`)

Resolve phase file path via `${CLAUDE_PLUGIN_ROOT}/skills/filid-review/phases/phase-a-structure.md`.
Fallback: `Glob(**/skills/filid-review/phases/phase-a-structure.md)`.

Prompt template:
```
Your PRIMARY DELIVERABLE is writing `<REVIEW_DIR>/structure-check.md`.
You MUST write this file before completing — all analysis is meaningless without it.

Read and follow the instructions in `<resolved phase-a path>`.

Context:
- REVIEW_DIR: <actual review dir>
- PROJECT_ROOT: <actual project root>
- BASE_REF: <actual base ref>
- BRANCH: <actual branch>

Language: Write all output in the language specified by the `[filid:lang]` tag in system context. If no tag is present, follow the system's language setting. Default: English.
Technical terms, code identifiers, rule IDs, and file paths remain in original form.

REMINDER: Write `<REVIEW_DIR>/structure-check.md` before you finish.
If you run low on budget, skip remaining stages and write the file with
partial results (mark skipped stages as SKIP).
```

Phase A scans only **files changed in this diff** across 5 structural stages
and records PASS/FAIL per stage plus a `critical_count` of CRITICAL+HIGH findings.
These findings flow into Phase D (fix items).

**Phase B: Analysis & Committee Election** (`general-purpose`, model: `haiku`,
`run_in_background: true`)
(haiku is chosen for speed; committee quality is ensured by the structured `review_manage(elect-committee)` MCP tool rather than LLM reasoning depth)

Resolve phase file path via `${CLAUDE_PLUGIN_ROOT}/skills/filid-review/phases/phase-b-analysis.md`.
Fallback: `Glob(**/skills/filid-review/phases/phase-b-analysis.md)`.

Prompt template:
```
Your PRIMARY DELIVERABLE is writing `<REVIEW_DIR>/session.md`.
You MUST write this file before completing — all analysis is meaningless without it.

Read and follow the instructions in `<resolved phase-b path>`.

Context:
- BRANCH: <actual branch>
- NORMALIZED: <actual normalized name>
- REVIEW_DIR: <actual review dir>
- BASE_REF: <actual base ref>
- SCOPE: <actual scope>
- PROJECT_ROOT: <actual project root>
- NO_STRUCTURE_CHECK: <true|false>
- ADJUDICATOR_MODE: <true|false>   # from --solo flag; passed to review_manage(elect-committee) as adjudicatorMode

Language: Write all output in the language specified by the `[filid:lang]` tag in system context. If no tag is present, follow the system's language setting. Default: English.
Technical terms, code identifiers, rule IDs, and file paths remain in original form.

REMINDER: Write `<REVIEW_DIR>/session.md` before you finish.
If you run low on budget, skip remaining analysis and write the file
with partial results.
```

**Await both** background agents before proceeding. If `--no-structure-check`,
only await Phase B.

**Race handling**: Phase B may complete before Phase A. If `structure-check.md`
does not exist when Phase B reads it, Phase B sets `STRUCTURE_CRITICAL_COUNT = 0`.
The chairperson awaits both phases before Phase C, ensuring Phase C and D always
have complete data.

#### Post-Completion Verification

After each subagent completes, verify its output file exists before proceeding:

1. Check: Does `<REVIEW_DIR>/<expected_file>` exist? (Read or Glob)
2. If **yes** → proceed to next step.
3. If **no** → the subagent failed to write its deliverable. Do NOT re-launch
   a subagent. Instead, read the phase instructions file yourself and execute
   the steps directly as the chairperson. This is faster and more reliable
   than re-delegating.

Apply this verification to Phase A (`structure-check.md`), Phase B
(`session.md`), Phase C1 (`verification-metrics.md`), and Phase C2
(`verification-structure.md`).

**→ After all background agents complete and outputs are verified, immediately proceed to Step 3.**

### Step 3 — Phase C1 + C2: Parallel Technical Verification (Delegated)

> Phase C is split into two parallel halves to reduce per-subagent context
> load. C1 covers file-level metrics (LCOM4, CC, 3+12, coverage). C2 covers
> structure, dependency acyclicity, drift, documentation, and debt bias.
> Both run as `general-purpose` subagents in parallel.

**Phase C1: Metrics** (`general-purpose`, model: `sonnet`,
`run_in_background: true`)

Resolve phase file path via `${CLAUDE_PLUGIN_ROOT}/skills/filid-review/phases/phase-c1-metrics.md`.
Fallback: `Glob(**/skills/filid-review/phases/phase-c1-metrics.md)`.

Prompt template:
```
Your PRIMARY DELIVERABLE is writing `<REVIEW_DIR>/verification-metrics.md`.
You MUST write this file before completing — all analysis is meaningless without it.

Read and follow the instructions in `<resolved phase-c1 path>`.

Context:
- REVIEW_DIR: <actual review dir>
- PROJECT_ROOT: <actual project root>

Input: Read `<REVIEW_DIR>/session.md` for session context.
If `<REVIEW_DIR>/structure-check.md` exists, read it for Phase A context.

Language: Write all output in the language specified by the `[filid:lang]` tag in system context. If no tag is present, follow the system's language setting. Default: English.
Technical terms, code identifiers, rule IDs, and file paths remain in original form.

REMINDER: Write `<REVIEW_DIR>/verification-metrics.md` before you finish.
Skip remaining checks and write partial results (mark skipped as SKIP) if budget is tight.
```

**Phase C2: Structure / Dependency / Drift / Debt** (`general-purpose`,
model: `sonnet`, `run_in_background: true`)

Resolve phase file path via `${CLAUDE_PLUGIN_ROOT}/skills/filid-review/phases/phase-c2-structure.md`.
Fallback: `Glob(**/skills/filid-review/phases/phase-c2-structure.md)`.

Prompt template:
```
Your PRIMARY DELIVERABLE is writing `<REVIEW_DIR>/verification-structure.md`.
You MUST write this file before completing — all analysis is meaningless without it.

Read and follow the instructions in `<resolved phase-c2 path>`.

Context:
- REVIEW_DIR: <actual review dir>
- PROJECT_ROOT: <actual project root>

Input: Read `<REVIEW_DIR>/session.md` for session context.
If `<REVIEW_DIR>/structure-check.md` exists, read it for Phase A context.

Language: Write all output in the language specified by the `[filid:lang]` tag in system context. If no tag is present, follow the system's language setting. Default: English.
Technical terms, code identifiers, rule IDs, and file paths remain in original form.

REMINDER: Write `<REVIEW_DIR>/verification-structure.md` before you finish.
Skip remaining checks and write partial results (mark skipped as SKIP) if budget is tight.
```

**Await both** C1 and C2 background agents before proceeding.

#### Phase C batch partitioning (context budget control)

Before spawning Phase C1/C2, apply the same threshold used for Phase A:

| Changed files | Phase C strategy |
| ------------- | ---------------- |
| `<= 15`       | Single C1 subagent + single C2 subagent in parallel (current behavior) |
| `> 15 && <= 30` | Partition changed source files into 10-file batches. Spawn one C1 subagent per batch (writing `verification-metrics.partial-<batchId>.md`). C2 spawns one subagent per batch for per-file checks (`verification-structure.partial-<batchId>.md`) PLUS one additional subagent for project-wide scans (`structure_validate`, `drift_detect`, `debt_manage`) writing `verification-structure.global.md`. |
| `> 30`        | **Team promotion**: create a dedicated `review-c-<normalized-branch>` team (distinct from Phase D's `review-<normalized-branch>` team). Spawn one Claude Code team worker per batch as `name: c1-batch-<N>` / `c2-batch-<N>` plus `c2-global`. After all workers complete, `TeamDelete` the team. See `phase-c1-metrics.md` / `phase-c2-structure.md` for the per-worker instructions. |

After every batch path, the chairperson merges partials:

1. `verification-metrics.partial-*.md` → `verification-metrics.md`
   (concatenate finding tables, dedupe by `path+rule`, recompute
   `metrics_passed` and count fields)
2. `verification-structure.partial-*.md` + `verification-structure.global.md`
   → `verification-structure.md` (merge per-file rows from partials, keep
   project-wide rows from the global file)

The batch list is computed once and reused for both C1 and C2 so that
the same batch boundaries apply to both halves.

Each batched subagent receives its batch file list in the `Context` block:

```
Context:
- REVIEW_DIR: <actual review dir>
- PROJECT_ROOT: <actual project root>
- BATCH_ID: <integer or empty>
- BATCH_FILES: <newline-separated file paths or empty>
  # If BATCH_ID is set, operate ONLY on these files. Write output to
  # verification-metrics.partial-<BATCH_ID>.md (C1) or
  # verification-structure.partial-<BATCH_ID>.md (C2) instead of the
  # consolidated file.
- SCOPE_OVERRIDE: <per-file | global | empty>
  # C2 only: "global" means skip per-file checks and run only
  # structure_validate / drift_detect / debt_manage, writing
  # verification-structure.global.md.
```

#### Post-Phase C Verification

After both subagents complete, verify both
`<REVIEW_DIR>/verification-metrics.md` and
`<REVIEW_DIR>/verification-structure.md` exist. If either is missing, execute
the corresponding phase directly as chairperson (same fallback as Step 2).

**→ After both Phase C halves complete and outputs are verified, IMMEDIATELY proceed to Step 4 in the same response. Do NOT yield.**

### Step 4 — Phase D: Political Consensus (Team Deliberation)

Phase D executes the full multi-persona deliberation via Claude Code's
native team tools (when `committee.length >= 2`) or a single Task subagent
(when `committee.length == 1`). The chairperson (main session) is the team
lead — it NEVER delegates Phase D to a general-purpose subagent.

**Read the detailed phase file**: Resolve
`${CLAUDE_PLUGIN_ROOT}/skills/filid-review/phases/phase-d-deliberation.md`
(fallback `Glob`) and follow its step-by-step procedure. The phase file
defines:

- Step D.0: Merge `verification-metrics.md` + `verification-structure.md`
  into `verification.md`
- Step D.1: Committee size branch (solo vs team)
- Step D.2-solo: Single Task spawn for `committee.length == 1`
- Step D.2-team: `TeamCreate` + parallel worker spawns for
  `committee.length >= 2`
- Step D.3: Round evaluation (state machine from `state-machine.md`)
- Step D.4: VETO branch (compromise round)
- Step D.5: Recovery plan (dead worker detection + respawn)
- Step D.6: CONCLUSION — write `review-report.md` + `fix-requests.md` and
  perform team shutdown + `TeamDelete`

**Chairperson invariants during Phase D**:

1. The chairperson NEVER calls MCP measurement tools directly — all metrics
   come from `verification.md`, `verification-metrics.md`,
   `verification-structure.md`, and `structure-check.md`.
2. The chairperson reads `reference.md` for output templates
   (`review-report.md` / `fix-requests.md` format) before writing them.
3. The chairperson loads `state-machine.md` for round judgment rules.
4. Personas are **never** loaded from `personas/*.md` — that directory is
   deleted. Each persona is a real Claude Code agent at `agents/<id>.md`
   (e.g., `agents/engineering-architect.md`).
5. `--solo` (when provided by the user) is passed to Phase B as
   `adjudicatorMode: true` input to `review_manage(elect-committee)`, which
   returns `committee: ['adjudicator']` regardless of complexity.
   Phase D Step D.2-solo then spawns the `adjudicator` agent as a
   standalone `Task` (no Team infrastructure). The same code path is
   used for auto-selected TRIVIAL complexity.

**→ HIGH-RISK YIELD POINT: do NOT yield after Phase D outputs are written.
Chain Step 4.5 (persist content hash) in the same response immediately
after `review-report.md` and `fix-requests.md` exist and the team (if any)
has been deleted.**

### Step 4.5 — Persist Content Hash

After Phase D outputs are written, persist the content hash for future cache lookups:

Call: `review_manage(action: "content-hash", projectRoot: <project_root>, branchName: <branch>, baseRef: <base_ref>)`

This writes `content-hash.json` alongside the review outputs for future cache checks.

**→ After content hash is persisted, immediately proceed to Step 5.**

### Step 5 — PR Comment (Optional)

When `--scope=pr`:

1. Call `review_manage(action: "format-pr-comment", projectRoot: <project_root>, branchName: <branch>)` to get the formatted markdown.
2. Check: `gh auth status` (Bash)
3. If authenticated: `gh pr comment --body "<markdown>"` (Bash) — use the `markdown` field from the tool result as-is.
4. If not authenticated: skip with info message.

> **Language**: All output files and PR comments MUST be written in the language
> specified by the `[filid:lang]` tag in system context (configured in `.filid/config.json`).
> If no tag is present, follow the system's language setting; default to English. This applies to review-report.md,
> fix-requests.md, structure-check.md findings, PR comments, and any additional
> commentary. Technical terms, code identifiers, rule IDs, and file paths
> remain in their original form.

**After PR comment step completes (or is skipped), execution is COMPLETE.**

## Available MCP Tools

| Tool             | Action              | Purpose                                                 |
| ---------------- | ------------------- | ------------------------------------------------------- |
| `review_manage`  | `normalize-branch`  | Normalize branch name for review directory path         |
| `review_manage`  | `ensure-dir`        | Create `.filid/review/<branch>/` directory              |
| `review_manage`  | `elect-committee`   | Deterministic committee election (Phase B). Accepts optional `adjudicatorMode: boolean` to force the integrated `adjudicator` fast-path agent. Emits TRIVIAL/LOW/MEDIUM/HIGH complexity with committees of 1/2/4/6 members. |
| `review_manage`  | `checkpoint`        | Check existing review progress for resume               |
| `review_manage`  | `cleanup`           | Delete review session files (--force or on pass)        |
| `review_manage`  | `content-hash`      | Compute and persist content hash for cache              |
| `review_manage`  | `check-cache`       | Check if review can be skipped (cache hit)              |
| `review_manage`  | `format-pr-comment` | Format review results into collapsible PR comment       |
| `debt_manage`    | `calculate-bias`    | Compute debt bias level for Phase C2 + D deliberation   |

Phase D (deliberation) uses Claude Code's native team tools — `TeamCreate`,
`TeamDelete`, `TaskCreate`, `TaskUpdate`, `TaskList`, `SendMessage`, `Task`
— NOT MCP tools. See `phases/phase-d-deliberation.md` for the full team
orchestration protocol.

## Options

> Options are LLM-interpreted hints, not strict CLI flags. Natural language works equally well (e.g., "review this PR" instead of `--scope=pr`).

```
/filid:filid-review [--scope=branch|pr|commit] [--base=<ref>] [--force] [--verbose] [--no-structure-check]
```

| Option                  | Default  | Description                                        |
| ----------------------- | -------- | -------------------------------------------------- |
| `--scope`               | `branch` | Review scope (branch, pr, commit)                  |
| `--base`                | auto     | Comparison base ref                                |
| `--force`               | off      | Delete existing review, restart from Phase A       |
| `--verbose`             | off      | Show detailed deliberation process                 |
| `--no-structure-check`  | off      | Skip Phase A (faster; omits structure compliance)  |
| `--solo`                | off      | Force `adjudicator` fast-path agent (integrated 6-perspective review, skips committee election and state machine) |

`--solo` does NOT take an argument. It always selects the
`adjudicator` agent (`packages/filid/agents/adjudicator.md`), which
covers all six committee perspectives (structure, documentation,
stability, velocity, user-value, cognitive load) in a single context and
produces a consolidated verdict in one round. Use this for small or
time-sensitive changes where adversarial multi-persona debate provides
no marginal value.

## Quick Reference

```
/filid:filid-review                                    # Full review (A + B + C1/C2 + D team)
/filid:filid-review --scope=pr                         # Review + post PR comment
/filid:filid-review --force                            # Force restart from Phase A
/filid:filid-review --no-structure-check               # Skip Phase A structure pre-check
/filid:filid-review --solo                             # Fast-path adjudicator (6-perspective integrated)
/filid:filid-review --base=main --verbose              # Verbose review against main

Phases:   A (Structure/sonnet) ┐
          B (Analysis/haiku)  ┘→ C1 (Metrics/sonnet)  ┐
                                C2 (Structure/sonnet) ┘→ D (Team consensus/direct)
          [A + B parallel, C1 + C2 parallel]
Outputs:  structure-check.md (A), session.md (B),
          verification-metrics.md (C1), verification-structure.md (C2),
          verification.md (merged by chairperson),
          rounds/round-<N>-<persona-id>.md (committee members),
          review-report.md, fix-requests.md (Phase D)
Resume:   Automatic via checkpoint detection
Committee:
  TRIVIAL (1)   — single-file change, no interface → adjudicator
  LOW (2)       — small non-interface change → team of 2 specialists
  MEDIUM (4)    — interface or moderate size → team of 4 specialists
  HIGH (6)      — >10 files or >=4 fractals → team of 6 specialists
  --solo        — manual override → adjudicator (integrated 6-perspective)
Rounds:   Max 5 deliberation rounds (team mode only)
Verdict:  APPROVED | REQUEST_CHANGES | INCONCLUSIVE
Recovery: Dead worker → probe → respawn (max 2) → forced ABSTAIN
```
