# filid-review — Data Contracts & Meta Rules

Schemas and rules that govern committee composition, opinion files,
subagent prompt construction, and post-completion verification fallback.
SKILL.md and the phase files reference this document rather than
duplicating the contracts inline.

## Committee → Agent File Mapping

Phase D spawns committee members as real Claude Code subagents. Each
`PersonaId` from `src/types/review.ts` corresponds to exactly one agent
file under `packages/filid/agents/`:

| PersonaId (MCP + session.md) | Agent file                          | Role / Branch                       | Election tier     |
| ---------------------------- | ----------------------------------- | ----------------------------------- | ----------------- |
| `adjudicator`                | `agents/adjudicator.md`             | Integrated fast-path (6 lenses)     | `TRIVIAL` / `--solo` only |
| `engineering-architect`      | `agents/engineering-architect.md`   | Legislative — Structure             | LOW / MEDIUM / HIGH |
| `knowledge-manager`          | `agents/knowledge-manager.md`       | Judicial — Documentation            | MEDIUM / HIGH     |
| `operations-sre`             | `agents/operations-sre.md`          | Judicial — Stability                | LOW / MEDIUM / HIGH |
| `business-driver`            | `agents/business-driver.md`         | Executive — Velocity                | MEDIUM / HIGH     |
| `product-manager`            | `agents/product-manager.md`         | Translator — User value             | HIGH              |
| `design-hci`                 | `agents/design-hci.md`              | Humanist — Cognitive load           | HIGH              |

All seven agents have scoped tool access (`Read, Write, Glob, Grep, Bash`).
`Write` is used **exclusively** to author their
`rounds/round-<N>-<persona-id>.md` opinion file; modifying source files,
INTENT.md, DETAIL.md, or anything outside the review session's `rounds/`
subtree is prohibited by each agent's in-body `Hard Rules` section. `Edit`
is deliberately absent so no agent can rewrite existing files. They are
spawned via `Task(subagent_type: filid:<id>)` exclusively by
`phases/phase-d-deliberation.md`.

- **`adjudicator`** is a standalone `Task` (NO `team_name`). It runs
  when the committee is `['adjudicator']` — either TRIVIAL auto-tier or
  `--solo` manual flag. It internalizes all six specialist perspectives
  in a single pass, skips the state machine, and emits one
  `round-1-adjudicator.md` opinion that maps directly to the verdict.
- **Six specialist agents** run as team workers inside the
  `review-<normalized-branch>` team when committee size >= 2. They
  participate in the multi-round state machine deliberation.

Adding a new specialist persona requires a coordinated edit in three
places:

1. `src/types/review.ts` — add the ID to the `PersonaId` union
2. `src/mcp/tools/review-manage/review-manage.ts` — add to committee
   arrays (LOW / MEDIUM / HIGH) and adversarial pair logic as appropriate
3. `packages/filid/agents/<id>.md` — create the agent file with the Team
   Worker Protocol and Round Output Contract

Do NOT add new personas to the TRIVIAL tier — that tier is reserved for
the integrated `adjudicator` fast path.

## Complexity → Committee Mapping

| Complexity | Committee (canonical)                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| TRIVIAL    | `[adjudicator]`                                                                                            |
| LOW        | `[engineering-architect, operations-sre]`                                                                  |
| MEDIUM     | `[engineering-architect, knowledge-manager, business-driver, operations-sre]`                              |
| HIGH       | `[engineering-architect, knowledge-manager, operations-sre, business-driver, product-manager, design-hci]` |

This table mirrors `mcp_t_review_manage(elect-committee)` output and is
the sole reference for chairperson-side committee rewrites (e.g.,
structure-bias escalation). Keep in sync with
`src/mcp/tools/review-manage/handlers/elect-committee.ts`.

## Opinion Frontmatter Contract

Every `<REVIEW_DIR>/rounds/round-<N>-<persona-id>.md` file MUST begin
with a YAML frontmatter block matching the schema below. The chairperson
grep-parses these fields during state machine evaluation.

```yaml
---
round: <integer, 1..5>
persona: <PersonaId>
state: SYNTHESIS | VETO | ABSTAIN
confidence: <0.0-1.0>
rebuttal_targets: [<PersonaId>, ...]   # Round >= 2 only
fix_items:
  - id: <FIX-candidate-id or null>
    severity: CRITICAL | HIGH | MEDIUM | LOW
    source: structure | code-quality
    type: code-fix | filid-promote | filid-restructure
    path: <file path>
    rule: <violated rule id>
    current: <measured value>
    recommended_action: <short imperative>
    evidence: <verification line reference or stage reference>
compromise_accepted: <true|false>   # Optional — set when re-evaluating a VETO compromise
reasoning_gaps: [<free-form strings>]   # Metrics the persona needed but could not find
---
```

> **Note**: `severity` on fix_items uses the UPPERCASE review/debt scale `CRITICAL|HIGH|MEDIUM|LOW` (SSoT: `src/types/debt.ts` → `DebtSeverity`). This is distinct from (a) rule severity `error|warning|info` (`src/types/rules.ts` → `RuleSeverity`, for static rule definitions) and (b) drift severity lowercase `critical|high|medium|low` (`src/types/drift.ts` → `DriftSeverity`, for filid-sync output). See `templates/rules/filid_fca-policy.md` → **Severity Vocabulary** for all three scales and their advisory mapping.

### Field semantics

- **`round`** — 1-indexed round number. Must match the file name suffix.
- **`persona`** — MUST equal the `name` in the agent's frontmatter.
- **`state`** — drives Lead's state machine transition:
  - `SYNTHESIS` — agreement (with or without fix_items)
  - `VETO` — hard rejection; requires veto reason in body
  - `ABSTAIN` — excluded from the effective denominator in quorum math
  - Solo deliberation prohibits `ABSTAIN`.
- **`confidence`** — 0.0-1.0 self-reported certainty. Used as tiebreaker
  when aggregating fix_items from multiple personas.
- **`rebuttal_targets`** — list of PersonaIds whose prior-round opinion
  this persona explicitly disagrees with. Round 1 MUST leave this empty.
- **`fix_items`** — structured fixes that will be promoted to `FIX-XXX`
  entries in `fix-requests.md`. The chairperson deduplicates by
  `path + rule` across all personas.
- **`compromise_accepted`** — only set in VETO re-evaluation rounds. If
  `true`, the opinion's `state` should transition from prior VETO to
  SYNTHESIS with an acknowledgement in the body.
- **`reasoning_gaps`** — free-form list of measurements the persona
  needed but could not find in the verification artifacts. Does NOT
  block a SYNTHESIS verdict by itself; contributes to ABSTAIN rationale
  when the gap is structural.

### Special cases

- **Forced ABSTAIN** from the recovery plan: the chairperson writes a
  synthetic opinion file with `state: ABSTAIN`, `confidence: 0`, and
  `reasoning_gaps: ["worker unrecoverable after 2 respawn attempts"]`.
  The Deliberation Log MUST note `recovery: forced-abstain` for that
  persona.
- **Business Driver compromise file**: when Business Driver writes
  `round-<N>-business-driver-compromise.md` in response to a VETO, the
  frontmatter is extended with a `compromise_proposals` array (see
  `agents/business-driver.md` for the schema).

## Subagent Prompt Rules

When constructing subagent prompts (Phase A / B / C1 / C2), follow these
rules to ensure reliable output. The literal prompt templates live in
`prompt-templates.md`; the rules below govern how the chairperson fills
them in.

1. **State the output file first**: The prompt MUST begin with the
   mandatory output file path and format. Example: "Your PRIMARY
   DELIVERABLE is writing `<REVIEW_DIR>/structure-check.md`. You MUST
   write this file before completing."
2. **Provide concrete context values**: Substitute all variables
   (`REVIEW_DIR`, `PROJECT_ROOT`, `BASE_REF`, `BRANCH`,
   `ADJUDICATOR_MODE`, etc.) with actual values — never pass variable
   names for the subagent to resolve.
3. **Include the phase file path**: Tell the subagent to read the phase
   instructions file, then provide the resolved path. Example: "Read
   and follow the instructions in `/absolute/path/to/phase-a-structure.md`."
4. **Reinforce the output at the end**: Close the prompt with a
   reminder: "REMINDER: Write `<output_file>` before you finish. If you
   run low on budget, skip remaining analysis and write the file with
   partial results."
5. **Pass the language setting**: Include a language instruction in
   every subagent prompt using the `[filid:lang]` tag from system
   context (e.g., `[filid:lang] ko`). If no tag is present, follow the
   system's language setting; default to English. This ensures output
   files (structure-check.md, session.md, verification.md,
   review-report.md, fix-requests.md) are written in the configured
   language. Technical terms, code identifiers, rule IDs, and file paths
   remain in original form.

## Post-Completion Verification Fallback (A/B/C1/C2 only — Phase D excluded)

> **Terminology**: "fallback" in filid-review refers to COVERAGE FALLBACK (when Phase D is skipped, main-context chairperson writes the minimal review-report.md). This is distinct from `filid-ast-fallback`, which is DEGRADATION FALLBACK (LLM-based AST pattern matching when `@ast-grep/napi` native module is unavailable).

This fallback applies **only** to Phase A, B, C1, and C2. **Phase D is
excluded** from the chairperson-direct fallback path — main MUST NOT
fabricate a Phase D verdict when the A/B/C subagent fails. Instead, route
the failure through the `verdict_gate` rule in
`packages/filid/skills/filid-review/DETAIL.md` (`## API Contracts`) with
dispatch `fail` and verdict `INCONCLUSIVE`. See
`packages/filid/skills/filid-review/phases/phase-d-deliberation.md` Step D.7.

After each A/B/C subagent completes, verify its output file exists before
proceeding:

1. Check: Does `<REVIEW_DIR>/<expected_file>` exist? (Read or Glob)
2. If **yes** → proceed to next step.
3. If **no** → the subagent failed to write its A/B/C deliverable. Do NOT
   re-launch a subagent. Instead, read the A/B/C phase instructions file
   yourself and execute the steps directly as the chairperson. This is
   faster and more reliable than re-delegating.

Apply this verification to every delegated A/B/C phase (and no further):

| Phase | Expected output                  |
| ----- | -------------------------------- |
| A     | `structure-check.md`             |
| B     | `session.md`                     |
| C1    | `verification-metrics.md`        |
| C2    | `verification-structure.md`      |

For batched A/B/C phases (`changedFilesCount > 15`), verify every
`<base>.partial-<batchId>.md` file exists before merging. Missing partials
trigger the same chairperson-direct fallback on the missing batch only — do
not re-run successful batches. This batched fallback, too, applies only to
A/B/C1/C2.

### Phase D protocol violation (chairperson-direct synthesis forbidden)

A `chairperson-direct` Phase D synthesis — main writing a SYNTHESIS verdict
without running either the `team` dispatch (`TeamCreate` + N `Task`s) or the
`solo-adjudicator` dispatch (single `Task(filid:adjudicator)`) — is a
**protocol violation** (프로토콜 위반). Phase D runs only in the main
orchestrator, and only via one of those two sanctioned dispatches. Any
deviation yields `deliberation_mode == "chairperson-forbidden"` and the
`verdict_gate` MUST block the merge with `verdict: INCONCLUSIVE`.
