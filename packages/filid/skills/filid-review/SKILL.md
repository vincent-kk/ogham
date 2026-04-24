---
name: filid-review
user_invocable: true
description: "[filid:filid-review] Run multi-persona consensus code review governance: structure check (Phase A), analysis & committee election (Phase B), parallel technical verification (Phase C1 metrics + C2 structure), then Phase D political consensus executed as a real Claude Code team (committee.length >= 2) or a single Task (committee.length == 1)."
argument-hint: "[--scope branch|pr|commit] [--base REF] [--force] [--verbose] [--no-structure-check] [--solo]"
version: "2.1.0"
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
>
> **PIPELINE SUBAGENT MODE**: When invoked from the
> pipeline orchestrator as an A/B/C-only subagent (signalled via
> `--pipeline-mode=abc-only` or the `PIPELINE_MODE=abc-only` context
> key), this skill STOPS after Step 3 (Phase C). Step 4 (Phase D), Step
> 4.5 (content-hash), and Step 5 (PR comment) MUST NOT execute inside
> the subagent — they run in the pipeline main after the subagent
> returns. The skill emits the Subagent Return Contract as its final
> assistant message (see Step 3.9) and terminates. In user-invoked mode
> (no pipeline flag) the skill runs all five steps as before.

# filid-review — AI Code Review Governance

Execute the multi-persona consensus-based code review governance
pipeline. The chairperson delegates Phase A (structure check), Phase B
(analysis & committee election), and Phase C (technical verification)
to subagents, then directly conducts Phase D (political consensus)
using elected committee personas and a state machine.

> **References**:
> - `state-machine.md` — round judgment rules (quorum, VETO branch, 5-round limit)
> - `templates.md` — `review-report.md` / `fix-requests.md` / PR comment formats
> - `contracts.md` — opinion frontmatter schema, committee → agent mapping, subagent prompt rules, post-completion verification fallback
> - `mcp-map.md` — MCP tool catalog, per-phase usage map, batch partitioning thresholds, checkpoint resume table, debt bias injection
> - `prompt-templates.md` — literal subagent prompt templates for Phase A / B / C1 / C2
> - `phases/phase-{a,b,c1,c2,d}-*.md` — per-phase instructions
> - `packages/filid/agents/<persona-id>.md` — real committee agents

## When to Use

- Before merging PRs requiring multi-perspective governance review
- When changes span multiple fractals or modify interfaces
- To generate structured fix requests with severity ratings and code patches
- When technical debt may influence review strictness

## Core Workflow

### Step 1 — Branch Detection & Checkpoint Resume

1. `git branch --show-current` (Bash) → `<branch>`
2. `mcp_t_review_manage(action: "normalize-branch", projectRoot, branchName: <branch>)`
3. `mcp_t_review_manage(action: "checkpoint", projectRoot, branchName: <branch>)`
4. Resume from the phase indicated by the checkpoint response. See
   `mcp-map.md` → "Checkpoint Resume Table" for the full file-presence
   → next-phase mapping, the `no_structure_check` frontmatter rule, and
   the `resume_attempts` increment recipe.

> **Max-retry guard (LOGIC-011)**: When the checkpoint response reports
> `resumeExhausted: true` (`resume_attempts >= 3`), TERMINATE with
> verdict `INCONCLUSIVE`. Report: "Resume exhausted after 3 Phase A
> retries — manual intervention required. Inspect
> `.filid/review/<branch>/session.md` and re-run with `--force` to
> start fresh." Then END execution. Do not enter any further phase.

If `--force`: call `mcp_t_review_manage(action: "cleanup", projectRoot, branchName)`
first, then restart from Phase A (or Phase B if `--no-structure-check`).

5. Cache check (skip when `--force`):
   `mcp_t_review_manage(action: "check-cache", projectRoot, branchName, baseRef)`
   - `"skip-to-existing-results"` → read existing `review-report.md`
     and `fix-requests.md` from the paths in the response. In user-invoked
     mode: Done. In **Pipeline Subagent Mode** (`--pipeline-mode=abc-only`):
     parse `verdict` from `review-report.md` frontmatter, read `committee`
     / `deliberation_mode` from `session.md`, then emit the Step 3.9
     `SubagentReturn` block with `failure_reason: none` and the existing
     artifact paths — pipeline main will reuse the cached verdict and skip
     Phase D dispatch.
   - `"proceed-full-review"` → continue to Step 2.

> `mcp_t_review_manage(action: "check-cache", ...)` returns `{ action: "skip-to-existing-results" | "proceed-full-review", ... }`. On `skip-to-existing-results`, the pipeline short-circuits to the finalize-review stage.

**→ After entry point is determined, immediately proceed to Step 2.**

### Step 2 — Phase A + B: Parallel Delegation

Phase A and Phase B are independent and run **in parallel** as separate
`general-purpose` Task subagents (`run_in_background: true`). Phase A is
skipped when `--no-structure-check` is set; in that case only Phase B
runs.

> `general-purpose` is chosen (not filid agents) because these phases
> perform broad analysis that benefits from unrestricted tool access.

| Phase | Model  | Phase file                        | Output file             |
| ----- | ------ | --------------------------------- | ----------------------- |
| A     | sonnet | `phases/phase-a-structure.md`     | `structure-check.md`    |
| B     | haiku  | `phases/phase-b-analysis.md`      | `session.md`            |

Resolve each phase file path via
`${CLAUDE_PLUGIN_ROOT}/skills/filid-review/phases/<phase>.md` (fallback:
`Glob(**/skills/filid-review/phases/<phase>.md)`).

**Prompt construction**: Use the literal templates in
`prompt-templates.md` → Phase A / Phase B. Substitute concrete values
for every `<placeholder>` before spawning — the chairperson must not
pass variable names for the subagent to resolve. Follow the meta-rules
in `contracts.md` → "Subagent Prompt Rules" (state deliverable first,
resolve paths, pass language setting, reinforce reminder).

**Batch partitioning**: When `changedFilesCount > 15`, partition changed
files into 10-file batches and spawn one Phase A subagent per batch in
parallel. Each batched subagent writes `structure-check.partial-<batchId>.md`;
the chairperson merges partials into the canonical `structure-check.md`
before Step 3. See `mcp-map.md` → "Batch Partitioning Thresholds" for
the full threshold table and merge protocol.

**Await both** background agents before proceeding. If `--no-structure-check`,
only await Phase B.

**Structure-bias escalation (main)**: After both phases complete, read
`structure-check.md` frontmatter `critical_count` (treat as 0 when Phase
A was skipped). If `critical_count >= 3` AND `adjudicator_mode == false`,
escalate complexity by one level (TRIVIAL→LOW, LOW→MEDIUM, MEDIUM→HIGH)
and overwrite `session.md` frontmatter `committee` / `complexity` using
the canonical table in `contracts.md` → "Complexity → Committee Mapping".
Additionally, overwrite `deliberation_mode` per the derivation rule in
`phases/phase-b-analysis.md` → §B.3.5:

- `committee == ['adjudicator']` → `deliberation_mode: solo-adjudicator`
- `committee.length >= 2` → `deliberation_mode: team`

Adjudicator mode is never escalated.

**Post-completion verification**: After each subagent completes, verify
its output file exists before proceeding. If missing, execute the phase
instructions directly as chairperson rather than re-delegating. See
`contracts.md` → "Post-Completion Verification" for the full fallback
procedure.

> **Terminology**: "fallback" in filid-review refers to COVERAGE FALLBACK (when a Phase A/B/C1/C2 subagent output is missing, main-context chairperson executes the phase instructions directly). This is distinct from `filid-ast-fallback`, which is DEGRADATION FALLBACK (LLM-based AST pattern matching when `@ast-grep/napi` native module is unavailable).

**→ After both background agents complete and outputs are verified,
immediately proceed to Step 3.**

### Step 3 — Phase C1 + C2: Parallel Technical Verification

Phase C is split into two parallel halves to reduce per-subagent context
load. Both run as `general-purpose` subagents in parallel.

| Phase | Model  | Phase file                        | Output file                   | Scope                                                        |
| ----- | ------ | --------------------------------- | ----------------------------- | ------------------------------------------------------------ |
| C1    | sonnet | `phases/phase-c1-metrics.md`      | `verification-metrics.md`     | file-level metrics (LCOM4, CC, 3+12, coverage)               |
| C2    | sonnet | `phases/phase-c2-structure.md`    | `verification-structure.md`   | structure, dependency acyclicity, drift, documentation, debt |

**Prompt construction**: Use the literal templates in
`prompt-templates.md` → Phase C1 / Phase C2. Each subagent reads
`session.md` for context and `structure-check.md` (if present) for
Phase A context.

**Batch partitioning**: Same `changedFilesCount > 15` threshold as
Phase A. Between 15 and 30 files → partition per-file work into 10-file
batches (C2 also runs one extra `c2-global` subagent for project-wide
scans). Above 30 files → promote to a dedicated
`review-c-<normalized-branch>` team with one worker per batch. See
`mcp-map.md` → "Batch Partitioning Thresholds" for full details and
the merge protocol. `TeamDelete` the `review-c-<normalized-branch>`
team as soon as all C1/C2 workers complete — before entering Phase D.

**Await both** C1 and C2 background agents before proceeding. Apply
the same post-completion verification as Step 2 (see `contracts.md`).

**→ After both Phase C halves complete and outputs are verified,
IMMEDIATELY proceed to Step 3.9 (pipeline subagent mode) or Step 4
(user-invoked mode) in the same response. Do NOT yield.**

### Step 3.9 — Pipeline Subagent Mode Exit

**Skip this step entirely when neither `--pipeline-mode=abc-only` nor
the `PIPELINE_MODE=abc-only` context key is set** — in user-invoked
mode proceed directly to Step 4.

When invoked from the pipeline orchestrator as an A/B/C-only subagent,
this skill MUST NOT execute Step 4 (Phase D), Step 4.5 (content-hash),
or Step 5 (PR comment). Instead, emit the Subagent Return Contract
defined in `DETAIL.md` → `## API Contracts` as the final assistant
message and terminate.

1. Read `<REVIEW_DIR>/session.md` frontmatter to extract `committee`,
   `deliberation_mode`, and `failure_reason`. If `deliberation_mode` is
   missing (legacy session.md without the field), derive it locally:
   - `committee == ['adjudicator']` → `solo-adjudicator`
   - `committee.length >= 2` → `team`
   If `failure_reason` is missing, default to `none`.
2. Verify required artifacts exist. Always required: `session.md`,
   `verification-metrics.md`, `verification-structure.md`. Required only
   when Phase A ran (`NO_STRUCTURE_CHECK=false`): `structure-check.md`.
   Any missing required artifact → set `deliberation_mode:
   chairperson-forbidden`, `failure_reason: team-incomplete` so the
   pipeline main blocks the merge via `verdict_gate`.
3. Emit the following fenced block verbatim as the terminal assistant
   message, substituting real values for every placeholder:

   ```yaml
   SubagentReturn:
     committee: [<persona-id>, ...]
     deliberation_mode: <team | solo-adjudicator | chairperson-forbidden>
     failure_reason: <none | phase-d-team-spawn-unavailable | team-incomplete | round5-exhaust>
     paths_to_artifacts:
       structure_check: <REVIEW_DIR>/structure-check.md | null
       session: <REVIEW_DIR>/session.md
       verification_metrics: <REVIEW_DIR>/verification-metrics.md
       verification_structure: <REVIEW_DIR>/verification-structure.md
   ```
4. Terminate. Do NOT read Phase D's phase file, do NOT call `TeamCreate`,
   do NOT write `review-report.md` or `fix-requests.md`. The pipeline
   main will dispatch Phase D via the `verdict_gate` rule and write
   those artifacts itself.

**→ After SubagentReturn is emitted, execution is COMPLETE for the
subagent. Return control to the pipeline main.**

### Step 4 — Phase D: Political Consensus (Team Deliberation)

> **Pipeline Subagent Mode guard**: If `--pipeline-mode=abc-only` was set,
> Step 3.9 already terminated this skill — execution MUST NOT reach Step 4
> in that mode.
>
> Step 4 (Phase D) executes in two mutually exclusive contexts, and this
> SKILL.md file is only one of them:
>
> 1. **User-invoked (standalone) path** — this skill runs all five steps
>    end-to-end; Step 4 executes here verbatim.
> 2. **Pipeline main context** — the pipeline orchestrator does NOT
>    re-invoke `filid-review`. It reads `phases/phase-d-deliberation.md`
>    directly and drives Phase D Dispatch per `filid-pipeline/SKILL.md` →
>    "Stage: Phase D Dispatch". In this case the present SKILL.md Step 4
>    is a documentation reference, not an entry point.

Phase D executes the full multi-persona deliberation via Claude Code's
native team tools (when `committee.length >= 2`) or a single Task
subagent (when `committee.length == 1`). The chairperson (main session)
is the team lead — it NEVER delegates Phase D to a general-purpose
subagent.

**Read the detailed phase file**: Resolve
`${CLAUDE_PLUGIN_ROOT}/skills/filid-review/phases/phase-d-deliberation.md`
(fallback `Glob`) and follow its step-by-step procedure. The phase file
defines:

- Step D.0 — Merge `verification-metrics.md` + `verification-structure.md`
  into `verification.md`
- Step D.1 — Committee size branch (solo vs team)
- Step D.2-solo — Single Task spawn for `committee.length == 1`
- Step D.2-team — `TeamCreate` + parallel worker spawns for
  `committee.length >= 2`
- Step D.3 — Round evaluation (state machine from `state-machine.md`)
- Step D.4 — VETO branch (compromise round)
- Step D.5 — Recovery plan (dead worker detection + respawn)
- Step D.6 — CONCLUSION — write `review-report.md` + `fix-requests.md`
  and perform team shutdown + `TeamDelete`

**Chairperson invariants during Phase D**:

1. The chairperson NEVER calls MCP measurement tools directly — all
   metrics come from `verification.md`, `verification-metrics.md`,
   `verification-structure.md`, and `structure-check.md`.
2. The chairperson reads `templates.md` for output formats
   (`review-report.md` / `fix-requests.md`) before writing them.
3. The chairperson loads `state-machine.md` for round judgment rules.
4. Personas are **never** loaded from `personas/*.md` — that directory
   does not exist. Each persona is a real Claude Code agent at
   `packages/filid/agents/<id>.md` (e.g.,
   `agents/engineering-architect.md`).
5. `--solo` (when provided by the user) is passed to Phase B as
   `adjudicatorMode: true` input to `mcp_t_review_manage(elect-committee)`,
   which returns `committee: ['adjudicator']` regardless of
   complexity. Phase D Step D.2-solo then spawns the `adjudicator`
   agent as a standalone `Task` (no Team infrastructure). The same
   code path is used for auto-selected TRIVIAL complexity.

**→ HIGH-RISK YIELD POINT: do NOT yield after Phase D outputs are
written. Chain Step 4.5 (persist content hash) in the same response
immediately after `review-report.md` and `fix-requests.md` exist and
the team (if any) has been deleted.**

### Step 4.5 — Persist Content Hash

> **Pipeline Subagent Mode guard**: Skipped in pipeline
> subagent mode (the subagent exits at Step 3.9). Content-hash
> persistence runs in the pipeline main as part of the "finalize
> review" stage (`filid-pipeline/SKILL.md`).

After Phase D outputs are written, persist the content hash for future
cache lookups:

`mcp_t_review_manage(action: "content-hash", projectRoot, branchName, baseRef)`

This writes `content-hash.json` alongside the review outputs.

**→ After content hash is persisted, immediately proceed to Step 5.**

### Step 5 — PR Comment (Optional)

> **Pipeline Subagent Mode guard**: Skipped in pipeline
> subagent mode (the subagent exits at Step 3.9). PR-comment emission
> runs in the pipeline main as part of the "finalize review" stage
> (`filid-pipeline/SKILL.md`).

When `--scope=pr`:

1. `mcp_t_review_manage(action: "format-pr-comment", projectRoot, branchName)`
   → returns formatted markdown.
2. `gh auth status` (Bash).
3. If authenticated: `gh pr comment --body "<markdown>"` (Bash) — use
   the `markdown` field from the tool result as-is.
4. If not authenticated: skip with info message.

> **Language**: All output files and PR comments MUST be written in the
> language specified by the `[filid:lang]` tag in system context
> (configured in `.filid/config.json`). If no tag is present, follow
> the system's language setting; default to English. This applies to
> `review-report.md`, `fix-requests.md`, `structure-check.md`
> findings, PR comments, and any additional commentary. Technical
> terms, code identifiers, rule IDs, and file paths remain in their
> original form.

**After PR comment step completes (or is skipped), execution is
COMPLETE.**

## Options

> Options are LLM-interpreted hints, not strict CLI flags. Natural
> language works equally well (e.g., "review this PR" instead of
> `--scope=pr`).

```
/filid:filid-review [--scope=branch|pr|commit] [--base=<ref>] [--force] [--verbose] [--no-structure-check] [--solo]
```

| Option                  | Default  | Description                                        |
| ----------------------- | -------- | -------------------------------------------------- |
| `--scope`               | `branch` | Review scope (branch, pr, commit)                  |
| `--base`                | auto     | Comparison base ref                                |
| `--force`               | off      | Delete existing review, restart from Phase A       |
| `--verbose`             | off      | Show detailed deliberation process                 |
| `--no-structure-check`  | off      | Skip Phase A (faster; omits structure compliance)  |
| `--solo`                | off      | Force `adjudicator` fast-path agent (integrated 6-perspective review, skips committee election and state machine) |

`--solo` does NOT take an argument. It always selects the `adjudicator`
agent (`packages/filid/agents/adjudicator.md`), which covers all six
committee perspectives (structure, documentation, stability, velocity,
user-value, cognitive load) in a single context and produces a
consolidated verdict in one round. Use this for small or time-sensitive
changes where adversarial multi-persona debate provides no marginal
value.

## Quick Reference

```
/filid:filid-review                            # Full review (A + B + C1/C2 + D team)
/filid:filid-review --scope=pr                 # Review + post PR comment
/filid:filid-review --force                    # Force restart from Phase A
/filid:filid-review --no-structure-check       # Skip Phase A structure pre-check
/filid:filid-review --solo                     # Fast-path adjudicator (6-perspective)
/filid:filid-review --base=main --verbose      # Verbose review against main

Phases:   A (Structure/sonnet) ┐
          B (Analysis/haiku)   ┘→ C1 (Metrics/sonnet)    ┐
                                  C2 (Structure/sonnet)  ┘→ D (Team consensus/direct)
          [A + B parallel, C1 + C2 parallel]
Outputs:  structure-check.md (A), session.md (B),
          verification-metrics.md (C1), verification-structure.md (C2),
          verification.md (merged by chairperson),
          rounds/round-<N>-<persona-id>.md (committee members),
          review-report.md, fix-requests.md (Phase D)
Resume:   Automatic via checkpoint detection (see mcp-map.md)
Committee:
  TRIVIAL (1)   — single-file change, no interface → adjudicator
  LOW (2)       — small non-interface change → 2 specialists
  MEDIUM (4)    — interface or moderate size → 4 specialists
  HIGH (6)      — >10 files or >=4 fractals → 6 specialists
  --solo        — manual override → adjudicator (integrated 6-perspective)
Rounds:   Max 5 deliberation rounds (team mode only)
Verdict:  APPROVED | REQUEST_CHANGES | INCONCLUSIVE
Recovery: Dead worker → probe → respawn (max 2) → forced ABSTAIN
```
