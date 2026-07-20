---
name: cross-review
user_invocable: true
description: '[filid:cross-review] Run multi-perspective consensus code review: scope & committee election, technical evidence collection, one parallel committee opinion round, then adversarial verification that arbitrates disagreements and kills false positives before the verdict.'
argument-hint: '[--scope branch|pr|commit] [--base REF] [--force] [--solo]'
version: '3.1.0'
complexity: complex
plugin: filid
---

> **EXECUTION MODEL (Tier-2a Anti-Yield)**: Execute all steps as a SINGLE
> CONTINUOUS OPERATION. After each step completes, IMMEDIATELY chain the
> next tool call in the same response. Subagent outputs and opinion files
> are internal working data — do NOT summarize them to the user
> mid-execution.
>
> **Valid reasons to yield**:
>
> 1. Unrecoverable error requiring human intervention
> 2. Terminal stage marker emitted: `Review verdict: (APPROVED|REQUEST_CHANGES|INCONCLUSIVE)`
>    — only after `review-report.md` (+ `fix-requests.md` when applicable)
>    is written, the content hash is persisted, and the PR comment step
>    ran or was skipped.
>
> **HIGH-RISK YIELD POINTS**:
>
> 1. After evidence subagents return → chain Step 3 committee spawn immediately.
> 2. After the parallel committee Agents return → chain Step 4
>    aggregation + verifier spawn in the same response.
> 3. After verifier Agents return → chain verdict derivation + Step 5
>    report writes in the same response.

# cross-review — Multi-Perspective Consensus Code Review

The chairperson (main session) orchestrates: it elects a committee,
delegates technical measurement to evidence subagents, collects one
round of independent persona opinions in parallel, then runs an
**adversarial verification pass** over every blocking finding — the
arbitration step that resolves cross-persona disagreement and removes
false positives — before deriving the verdict.

Core properties: **multi-perspective** (2-6 personas, or the integrated
adjudicator), **opinion balance** (severity gate + dedup + VETO
override), **arbitration & false-positive removal** (verifier verdicts
CONFIRMED / PLAUSIBLE / REFUTED; REFUTED findings are dismissed and
recorded).

> **References** — resolve every skill file at
> `${CLAUDE_PLUGIN_ROOT}/skills/cross-review/<file>` (fallback:
> `Glob(**/skills/cross-review/<file>)`). Read `contracts.md` during
> Step 1 — Steps 1-5 apply its rules and paste its schema blocks into
> subagent prompts verbatim. Read `templates.md` before Step 5 (or on
> any early END that writes a report).
>
> - `contracts.md` — committee mapping, opinion schema, severity gate,
>   verifier verdict ladder, verdict derivation, acceptance claims,
>   config-patch gate
> - `templates.md` — `review-report.md` / `fix-requests.md` / advisory
>   ledger / PR comment formats
> - `phases/evidence.md` — evidence subagent instructions
> - `calibration/` — reviewer regression fixtures (run after any change
>   to finding discipline, severity anchoring, or verdict derivation)
> - `../../agents/<persona-id>.md` — committee persona agents

## When to Use

- Before merging PRs requiring multi-perspective review
- When changes span multiple fractals or modify interfaces
- To generate structured fix requests with severity ratings and patches

## Core Workflow

> **Spawn-mode invariant**: every subagent in this skill — evidence,
> committee personas, verifiers — is spawned as a parallel FOREGROUND
> `Agent` call with explicit `run_in_background: false`; the returning
> tool result is the synchronization point. Omitting the flag spawns a
> BACKGROUND agent: the call returns a task id instead of the result,
> output files get read before they exist, and healthy workers get
> misrecorded as failures. Never spawn background agents here, and
> never poll for files as a substitute for the foreground return.

### Step 1 — Scope & Session

1. `git branch --show-current` (Bash) → `<branch>`.
2. `mcp__plugin_filid_tools__review_manage(action: "normalize-branch", projectRoot, branchName)`
   → `<normalized>`; `REVIEW_DIR = .filid/review/<normalized>/`.

> **Spike harvest guard**: when `<branch>` matches `spike/*`, read
> `.filid/harvest/<normalized>/manifest.json`. If it is missing, stale
> (`head_sha` != `git rev-parse HEAD`), or expired (`created_at` older
> than 7 days), do NOT review: write the Harvest-Required Variant pair
> (`templates.md`) — `review-report.md` with `verdict: REQUEST_CHANGES`
> plus the single `Type: harvest-required` fix item — emit
> `Review verdict: REQUEST_CHANGES`, and END. Unharvested spike work has
> no oracle to judge it against.

3. Resolve `<BASE_REF>`: `--base` when given (verify with
   `git rev-parse --verify`); otherwise the `origin` HEAD branch
   (`git remote show origin`), falling back to `origin/main` then
   `origin/master`. No candidate → END with "Cannot auto-detect base.
   Specify --base explicitly."
4. If `--force`: `mcp__plugin_filid_tools__review_manage(action: "cleanup", projectRoot, branchName)`,
   then continue fresh. Otherwise:
   - `mcp__plugin_filid_tools__review_manage(action: "check-cache", projectRoot, branchName, baseRef)`
     — on `"skip-to-existing-results"`, read the existing
     `review-report.md`, report its verdict, emit the terminal marker,
     and END.
   - `mcp__plugin_filid_tools__review_manage(action: "checkpoint", projectRoot, branchName)`
     — resume from the artifacts listed in `files`:
     `review-report.md` present → report existing results and END;
     `verification.md` present → skip to Step 3;
     `session.md` only → skip to Step 2; none → continue.
5. Collect election inputs (Bash):
   `git diff <BASE_REF>..HEAD --name-only` → changed files count;
   changed fractal count (unique parent fractal dirs); interface changes
   (`index.ts` / public exports touched); document changes per the SSoT
   rule in `contracts.md` → "Document Change Signal".
6. `mcp__plugin_filid_tools__review_manage(action: "elect-committee", projectRoot, changedFilesCount, changedFractalsCount, hasInterfaceChanges, hasDocumentChanges, adjudicatorMode: <true when --solo, else false>)`
   → `{ complexity, committee }` (ignore any extra response fields).
7. `mcp__plugin_filid_tools__review_manage(action: "ensure-dir", projectRoot, branchName)`,
   then write `<REVIEW_DIR>/session.md`:

   ```markdown
   ---
   branch: <branch>
   normalized_branch: <normalized>
   base_ref: <BASE_REF>
   run_id: <normalized>@<git rev-parse --short HEAD>
   complexity: <TRIVIAL|LOW|MEDIUM|HIGH>
   committee: [<persona-id>, ...]
   adjudicator_mode: <true|false>
   changed_files_count: <N>
   changed_fractals: [<path>, ...]
   interface_changes: <true|false>
   created_at: <ISO 8601>
   ---

   ## Changed Files Summary

   | File | Change Type | Fractal |
   | ---- | ----------- | ------- |
   ```

**→ Immediately proceed to Step 2.**

### Step 2 — Evidence (technical measurement)

All MCP measurement runs here, in subagents — the chairperson never
measures. Resolve the phase file
`${CLAUDE_PLUGIN_ROOT}/skills/cross-review/phases/evidence.md`
(fallback: `Glob(**/skills/cross-review/phases/evidence.md)`).

- **≤ 15 changed files** — spawn ONE `general-purpose` subagent
  (`run_in_background: false`, model `sonnet`) that follows
  `phases/evidence.md` with `SCOPE: full` and writes
  `<REVIEW_DIR>/verification.md` directly.
- **> 15 changed files** — spawn TWO such subagents in the same
  response with `SCOPE: metrics-half` / `SCOPE: structure-half`, each
  writing `verification.<half>.partial.md`; the chairperson merges them
  into `verification.md` (union of sections, frontmatter per
  `phases/evidence.md` → "Merge"). No further split exists — the
  streaming-write discipline in `phases/evidence.md` keeps each agent's
  memory flat regardless of file count.

Prompt construction: state the output file first, substitute concrete
values for every placeholder, pass the `[filid:lang]` language setting,
and close with the write-before-finish reminder (rules:
`contracts.md` → "Subagent Prompt Rules").

**Completeness check**: `verification.md` is consumable only when its
frontmatter sentinel `verification_passed` holds a real value (not
`PENDING`). If the subagent finished but the file is missing or still a
`PENDING` skeleton, retry the phase ONCE with a fresh subagent; if it
fails again, write the INCONCLUSIVE variant of `review-report.md`
(`templates.md`) and END with `Review verdict: INCONCLUSIVE` (reason:
evidence unavailable).

**Committee escalation**: if `verification.md` frontmatter
`critical_failures >= 3` and `adjudicator_mode: false`, escalate
complexity one tier (LOW→MEDIUM, MEDIUM→HIGH) and overwrite
`session.md` `complexity` / `committee` using the canonical table in
`contracts.md` → "Complexity → Committee Mapping".

**→ Immediately proceed to Step 3.**

### Step 3 — Committee Opinions (one parallel round)

Spawn every committee member **in the same response** as parallel
foreground `Agent` calls (`subagent_type: "filid:<persona-id>"`,
`run_in_background: false`) — all results return together, a
deterministic sync point with no polling, probing, or teardown.

Worker prompt (per persona; solo adjudicator uses the same shape). The
chairperson pastes the frontmatter schema from `contracts.md` →
"Opinion Frontmatter Contract" into the `== OUTPUT ==` block — agents do
not resolve plugin paths themselves:

```
You are the <persona-id> review persona for branch <normalized>.
This is a SINGLE-ROUND review — there is no round 2, no debate, no
compromise negotiation. An independent verifier will adversarially
check your blocking findings afterward, so pass every finding with a
nameable consequence through rather than self-censoring.

== INPUTS ==
- <REVIEW_DIR>/session.md
- <REVIEW_DIR>/verification.md
You MAY Read/Grep changed source files and run read-only git commands
when the verification artifacts leave a gap.

== OUTPUT ==
Write exactly one file: <REVIEW_DIR>/opinions/<persona-id>.md
beginning with this frontmatter schema:

<Opinion Frontmatter Contract block pasted from contracts.md>

Emit claim_verdicts when verification.md lists in-scope acceptance
claims. Do NOT call Agent, SendMessage, or any orchestration tool.

Language: <from [filid:lang] tag, default English>
WRITE-FIRST (contracts.md → "Write-First Output Discipline"): your FIRST
tool action writes the opinion file as an ABSTAIN/confidence-0 skeleton;
rewrite the full file after each verified conclusion; trust
verification.md instead of re-running project-wide scans (aim under ~15
tool calls); your LAST write sets the final state/confidence/fix_items.
An unwritten opinion is a failed run.
```

- **Solo path** (`committee == ['adjudicator']`, from TRIVIAL tier or
  `--solo`): spawn only the adjudicator; it sweeps all six lenses in one
  opinion.
- **Failed member**: an Agent call that errors, returns without writing
  its opinion file, or leaves the file at the untouched
  ABSTAIN/confidence-0 skeleton is recorded as a forced ABSTAIN
  (`state: ABSTAIN`, `confidence: 0`, chairperson-written). Retry a
  failed member ONCE with a fresh Agent call before recording the
  ABSTAIN. If **more than half** of the committee failed (or the solo
  adjudicator failed), write the INCONCLUSIVE variant of
  `review-report.md` (`templates.md`) and END with
  `Review verdict: INCONCLUSIVE`.

**→ After all Agents return, immediately proceed to Step 4 in the same response.**

### Step 4 — Arbitration & Verification

The heart of opinion balance and false-positive removal. The
chairperson makes NO measurement calls — only the two bookkeeping tools
sanctioned in `contracts.md`.

1. **Aggregate & dedup**: collect `fix_items` from all
   `opinions/*.md`. Deduplicate by `path + rule` — highest severity
   wins, `confidence` as tiebreaker. Aggregate `claim_verdicts`
   per claim across non-ABSTAIN opinions with worst-wins ordering
   (`FAIL > INSUFFICIENT-EVIDENCE > PASS`), then fold non-PASS claims
   into the fix set (`FAIL` → HIGH `code-fix`;
   `INSUFFICIENT-EVIDENCE` → MEDIUM `harvest-required`) per
   `contracts.md` → "Acceptance Claims".
2. **Partition by the severity gate**: blocking (`>= MEDIUM`) vs
   advisory (`LOW`). Advisory items skip verification — they can never
   block. Empty blocking set AND no VETO → skip items 3-4 entirely
   (spawn no verifiers) and derive the verdict directly.
3. **Verify blocking candidates** (and every VETO's cited basis): group
   candidates by file into at most 4 parallel foreground
   `general-purpose` verifier Agents (`run_in_background: false`), each
   given the diff context, its candidate list, and the verdict ladder
   pasted from `contracts.md` → "Verifier Verdict Ladder" (including
   the verifier constraints and return format). Each returns
   per-candidate `CONFIRMED | PLAUSIBLE | REFUTED` with quoted-line
   evidence. A verifier that errors or returns no parseable verdicts is
   retried ONCE; if the retry fails too, its candidates survive as
   PLAUSIBLE, marked `unverified — verifier failed` in the Arbitration
   Log.
   Tool-measured metric rows in `verification.md` are ground truth —
   verifiers judge misapplication (wrong rule scope, wrong file class,
   e.g. INTENT.md's 50-line cap applied to DETAIL.md), misattribution,
   and whether the stated consequence is real; they never re-measure.
4. **Apply verdicts**: keep CONFIRMED and PLAUSIBLE; **REFUTED items
   are dismissed** and recorded in the report's Arbitration Log with
   the refuting evidence. A VETO whose cited basis is entirely REFUTED
   is dismissed the same way; otherwise the VETO stands.
5. **Derive the verdict** (`contracts.md` → "Verdict Derivation"):
   - standing VETO, or critical-security override → `REQUEST_CHANGES`
   - surviving blocking set non-empty → `REQUEST_CHANGES`
   - surviving blocking set empty → `APPROVED` (presented as
     **APPROVED (with notes)** when advisory items exist — presentation
     only)
   - majority committee failure / evidence unavailable → `INCONCLUSIVE`

**→ Immediately proceed to Step 5 in the same response.**

### Step 5 — Report & Finalize

1. **Advisory ledger**: for each advisory item, update
   `.filid/review/advisory-ledger.md` (dedup key `path + rule`, at most
   one count per `run_id`; promote to a debt record at count 3 via
   `mcp__plugin_filid_tools__debt_manage(action: "create", ...)`) — format
   and rules: `templates.md` → "Advisory Ledger Format".
2. **Config-patch gate**: every fix whose patch modifies
   `.filid/config.json` MUST pass
   `mcp__plugin_filid_tools__config_patch_validate` before being written
   (dispatch rules: `contracts.md` → "Config Patch Contract").
3. Write `<REVIEW_DIR>/review-report.md` and — when the blocking set is
   non-empty — `<REVIEW_DIR>/fix-requests.md`, using `templates.md`
   formats. When the blocking set is EMPTY, delete any leftover
   `fix-requests.md` from a prior run (a stale file misroutes pipeline
   auto-detection into resolve). The report's Arbitration Log records
   per-persona positions, dedup collisions, every verifier verdict
   (including dismissed REFUTED items), and VETO handling.
4. `mcp__plugin_filid_tools__review_manage(action: "content-hash", projectRoot, branchName, baseRef)`.
5. **PR comment** (only when `--scope=pr`):
   `mcp__plugin_filid_tools__review_manage(action: "format-pr-comment", projectRoot, branchName)`,
   then `gh auth status`; if authenticated, post the returned
   `markdown` via `gh pr comment --body-file` (edit the existing
   `Code Review Governance` comment in place when one exists — locate
   it via `gh pr view --json comments`). Not authenticated → skip
   quietly.
6. Emit the terminal marker: `Review verdict: <VERDICT>`.

> **Language**: all output files and PR comments follow the
> `[filid:lang]` tag from system context (default: English). Technical
> terms, code identifiers, rule IDs, and file paths stay in original
> form.

> **Protocol invariant**: the chairperson MUST NOT write a verdict
> without committee opinions on disk — a verdict synthesized directly by
> the main context is a protocol violation; when opinions cannot be
> obtained the only legal verdict is `INCONCLUSIVE`.

## Options

> Options are LLM-interpreted hints, not strict CLI flags. Natural
> language works equally well (e.g., "review this PR" instead of
> `--scope=pr`).

| Option    | Default  | Description                                                                     |
| --------- | -------- | ------------------------------------------------------------------------------- |
| `--scope` | `branch` | Review scope (branch, pr, commit); `pr` also posts the PR comment               |
| `--base`  | auto     | Comparison base ref                                                             |
| `--force` | off      | Delete the existing review session and restart fresh                            |
| `--solo`  | off      | Force the integrated `adjudicator` (single agent covering all six perspectives) |

## Quick Reference

```
/filid:cross-review                 # Full committee review
/filid:cross-review --scope=pr      # Review + PR comment
/filid:cross-review --solo          # Fast-path adjudicator
/filid:cross-review --force --base=main

Steps:    1 Scope/Session (main) → 2 Evidence (subagent) →
          3 Committee (parallel personas, 1 round) →
          4 Arbitrate/Verify (parallel verifiers) → 5 Report
Spawn:    every subagent foreground — run_in_background: false
Committee: TRIVIAL=adjudicator · LOW=2 · MEDIUM=4 · HIGH=6 specialists
Artifacts: session.md, verification.md, opinions/<persona>.md,
           review-report.md, fix-requests.md, content-hash.json
Verdict:   APPROVED | REQUEST_CHANGES | INCONCLUSIVE
Gate:      >= MEDIUM blocks; LOW → Advisory Notes (never blocks);
           VETO classes and the critical-security override are
           gate-independent
Arbiter:   verifier verdicts CONFIRMED / PLAUSIBLE / REFUTED —
           REFUTED findings and refuted VETOs are dismissed on record
```
