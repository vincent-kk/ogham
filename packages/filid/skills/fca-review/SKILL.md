---
name: fca-review
user_invocable: true
description: Multi-persona consensus-based code review governance. Delegates structure check (Phase A), analysis (Phase B), and verification (Phase C) to subagents, then executes political consensus (Phase D) directly as chairperson using a state machine with up to 5 deliberation rounds.
version: 1.0.0
complexity: high
---

> **EXECUTION MODEL**: Execute all steps as a SINGLE CONTINUOUS OPERATION.
> After each step/phase completes, IMMEDIATELY proceed to the next.
> NEVER yield the turn after subagent results return or MCP tools complete.
> Checkpoint resume decisions are internal — do NOT ask the user which phase to start from.

# fca-review — AI Code Review Governance

Execute the multi-persona consensus-based code review governance pipeline.
The chairperson delegates Phase A (structure check), Phase B (analysis &
committee election), and Phase C (technical verification) to subagents, then
directly conducts Phase D (political consensus) using elected committee personas
and a state machine.

> **References**: `state-machine.md` (deliberation rules), `reference.md`
> (output templates, MCP tool map), `personas/*.md` (loaded in Phase D only).

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
     - If `no_structure_check: false` or absent → Phase A only (Phase A likely failed while Phase B succeeded in parallel; preserve existing `session.md` and restart only Phase A)
   - `structure-check.md` + `session.md` (no `verification.md`) → Phase C
   - `session.md` + `verification.md` → Phase D
   - All complete (`review-report.md` exists) → "Review complete"

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

**Phase A: Structure Pre-Check** (`general-purpose`, model: `sonnet`,
`run_in_background: true`)

Resolve phase file path via `${CLAUDE_PLUGIN_ROOT}/skills/fca-review/phases/phase-a-structure.md`.
Fallback: `Glob(**/skills/fca-review/phases/phase-a-structure.md)`.

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

REMINDER: Write `<REVIEW_DIR>/structure-check.md` before you finish.
If you run low on budget, skip remaining stages and write the file with
partial results (mark skipped stages as SKIP).
```

Phase A scans only **files changed in this diff** across 5 structural stages
and records PASS/FAIL per stage plus a `critical_count` of CRITICAL+HIGH findings.
These findings flow into Phase D (fix items).

**Phase B: Analysis & Committee Election** (`general-purpose`, model: `haiku`,
`run_in_background: true`)

Resolve phase file path via `${CLAUDE_PLUGIN_ROOT}/skills/fca-review/phases/phase-b-analysis.md`.
Fallback: `Glob(**/skills/fca-review/phases/phase-b-analysis.md)`.

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

REMINDER: Write `<REVIEW_DIR>/session.md` before you finish.
If you run low on budget, skip remaining analysis and write the file
with partial results.
```

**Await both** background agents before proceeding. If `--no-structure-check`,
only await Phase B.

#### Post-Completion Verification

After each subagent completes, verify its output file exists before proceeding:

1. Check: Does `<REVIEW_DIR>/<expected_file>` exist? (Read or Glob)
2. If **yes** → proceed to next step.
3. If **no** → the subagent failed to write its deliverable. Do NOT re-launch
   a subagent. Instead, read the phase instructions file yourself and execute
   the steps directly as the chairperson. This is faster and more reliable
   than re-delegating.

Apply this verification to Phase A (`structure-check.md`), Phase B
(`session.md`), and Phase C (`verification.md`).

**→ After all background agents complete and outputs are verified, immediately proceed to Step 3.**

### Step 3 — Phase C: Technical Verification (Delegated)

Delegate to Task subagent (`general-purpose`, model: `sonnet`).

Resolve phase file path via `${CLAUDE_PLUGIN_ROOT}/skills/fca-review/phases/phase-c-verification.md`.
Fallback: `Glob(**/skills/fca-review/phases/phase-c-verification.md)`.

Prompt template:
```
Your PRIMARY DELIVERABLE is writing `<REVIEW_DIR>/verification.md`.
You MUST write this file before completing — all analysis is meaningless without it.

Read and follow the instructions in `<resolved phase-c path>`.

Context:
- REVIEW_DIR: <actual review dir>
- PROJECT_ROOT: <actual project root>

Input: Read `<REVIEW_DIR>/session.md` for session context.
If `<REVIEW_DIR>/structure-check.md` exists, read it for Phase A context.

REMINDER: Write `<REVIEW_DIR>/verification.md` before you finish.
If you run low on budget, skip remaining checks and write the file with
partial results (mark skipped checks as SKIP).
```

#### Post-Phase C Verification

After Phase C subagent completes, verify `<REVIEW_DIR>/verification.md` exists.
If missing, execute Phase C directly as chairperson (same fallback as Step 2).

**→ After Phase C subagent completes and output is verified, immediately proceed to Step 4.**

### Step 4 — Phase D: Political Consensus (Direct Execution)

The chairperson executes Phase D directly:

1. **Load inputs**: Read `session.md` + `verification.md`
2. **Load structure context**: Read `structure-check.md` if present
3. **Load personas**: Read the `elected_committee` list from `session.md` frontmatter (written by Phase B via `review_manage(elect-committee)`), then load only those persona files from `personas/*.md`
4. **Load state machine**: Read `state-machine.md` for transition rules
5. **Execute deliberation**: Run state machine (PROPOSAL → DEBATE → CONCLUSION)
   - Structure violations from `structure-check.md` are tabled as agenda items
     alongside code quality issues from `verification.md`
6. **Load output format**: Read `reference.md` for report templates
7. **Write outputs**:
   - `.filid/review/<branch>/review-report.md` — full review report (includes
     Structure Compliance section from Phase A)
   - `.filid/review/<branch>/fix-requests.md` — actionable fix items (includes
     CRITICAL/HIGH structure violations as FIX-XXX items)

**→ After outputs are written, immediately proceed to Step 4.5.**

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

> **Language**: Write any additional commentary you add around the formatted content in the same language as the current conversation context.

**After PR comment step completes (or is skipped), execution is COMPLETE.**

## Available MCP Tools

| Tool             | Action             | Purpose                                          |
| ---------------- | ------------------ | ------------------------------------------------ |
| `review_manage`  | `normalize-branch` | Normalize branch name for review directory path  |
| `review_manage`  | `ensure-dir`       | Create `.filid/review/<branch>/` directory       |
| `review_manage`  | `elect-committee`  | Deterministic committee election (Phase B)       |
| `review_manage`  | `checkpoint`       | Check existing review progress for resume        |
| `review_manage`  | `cleanup`          | Delete review session files (--force or on pass) |
| `review_manage`  | `content-hash`     | Compute and persist content hash for cache       |
| `review_manage`  | `check-cache`      | Check if review can be skipped (cache hit)       |
| `review_manage`  | `format-pr-comment` | Format review results into collapsible PR comment |
| `review_manage`  | `format-revalidate-comment` | Format re-validation results (used by fca-revalidate) |
| `debt_manage`    | `calculate-bias`    | Compute debt bias level for Phase C analysis      |

## Options

> Options are LLM-interpreted hints, not strict CLI flags. Natural language works equally well (e.g., "review this PR" instead of `--scope=pr`).

```
/filid:fca-review [--scope=branch|pr|commit] [--base=<ref>] [--force] [--verbose] [--no-structure-check]
```

| Option                  | Default  | Description                                        |
| ----------------------- | -------- | -------------------------------------------------- |
| `--scope`               | `branch` | Review scope (branch, pr, commit)                  |
| `--base`                | auto     | Comparison base ref                                |
| `--force`               | off      | Delete existing review, restart from Phase A       |
| `--verbose`             | off      | Show detailed deliberation process                 |
| `--no-structure-check`  | off      | Skip Phase A (faster; omits structure compliance)  |

## Quick Reference

```
/filid:fca-review                           # Full review (Phase A + B + C + D)
/filid:fca-review --scope=pr                # Review + post PR comment
/filid:fca-review --force                   # Force restart from Phase A
/filid:fca-review --no-structure-check      # Skip Phase A structure pre-check (faster)
/filid:fca-review --base=main --verbose     # Verbose review against main

Phases:   A (Structure/sonnet) ┐
          B (Analysis/haiku)  ┘→ C (Verification/sonnet) → D (Consensus/direct)
          [A + B run in parallel]
Outputs:  structure-check.md (Phase A), session.md (Phase B), verification.md (Phase C),
          review-report.md, fix-requests.md (Phase D)
Resume:   Automatic via checkpoint detection
Personas: 2-6 elected based on complexity (LOW/MEDIUM/HIGH) + structure violations
Rounds:   Max 5 deliberation rounds in state machine
Verdict:  APPROVED | REQUEST_CHANGES | INCONCLUSIVE
```
