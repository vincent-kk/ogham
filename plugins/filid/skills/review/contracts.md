# review — Data Contracts & Meta Rules

Schemas and rules that govern committee composition, opinion files,
subagent prompt construction, and post-completion verification fallback.
SKILL.md and the phase files reference this document rather than
duplicating the contracts inline.

## Committee → Agent File Mapping

Phase D spawns committee members as real Claude Code subagents. Each
`PersonaId` from `src/types/review.ts` corresponds to exactly one agent
file under `../../agents/`:

| PersonaId (MCP + session.md) | Agent file                        | Role / Branch                   | Election tier             |
| ---------------------------- | --------------------------------- | ------------------------------- | ------------------------- |
| `adjudicator`                | `agents/adjudicator.md`           | Integrated fast-path (6 lenses) | `TRIVIAL` / `--solo` only |
| `engineering-architect`      | `agents/engineering-architect.md` | Legislative — Structure         | LOW / MEDIUM / HIGH       |
| `knowledge-manager`          | `agents/knowledge-manager.md`     | Judicial — Documentation        | MEDIUM / HIGH             |
| `operations-sre`             | `agents/operations-sre.md`        | Judicial — Stability            | LOW / MEDIUM / HIGH       |
| `business-driver`            | `agents/business-driver.md`       | Executive — Velocity            | MEDIUM / HIGH             |
| `product-manager`            | `agents/product-manager.md`       | Translator — User value         | HIGH                      |
| `design-hci`                 | `agents/design-hci.md`            | Humanist — Cognitive load       | HIGH                      |

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
3. `plugins/filid/agents/<id>.md` — create the agent file with the Team
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

## Document Change Signal

`hasDocumentChanges` (input to `mcp_t_review_manage(elect-committee)`) is
computed by Phase B as:

```bash
git diff --name-only <BASE_REF>..HEAD | grep -E '(/|^)(INTENT|DETAIL)\.md$' >/dev/null
# exit 0 → hasDocumentChanges: true
# exit 1 → hasDocumentChanges: false
```

When `hasDocumentChanges: true` AND complexity is `LOW`, the committee
includes `knowledge-manager` (3-member LOW). MEDIUM/HIGH committees
already include `knowledge-manager`; the signal has no effect there.

Phase B (haiku model) MUST compute this signal explicitly. Falling back
to `false` on uncertainty is forbidden — if the diff cannot be inspected,
treat as `true` (fail-safe toward `knowledge-manager` inclusion).

This signal is the LOW-tier counterpart to BUG_REPORT
`detail-md-50-line-cascade` mitigation: it ensures DETAIL.md / INTENT.md
cap-rule cascades from `qa-reviewer` Phase A output cannot pass Phase D
without documentation-expert verification.

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
rebuttal_targets: [<PersonaId>, ...] # Round >= 2 only
fix_items:
  - id: <FIX-candidate-id or null>
    severity: CRITICAL | HIGH | MEDIUM | LOW
    source: structure | code-quality
    type: code-fix | promote | restructure
    path: <file path>
    rule: <violated rule id>
    current: <measured value>
    consequence: <what concretely breaks if left unaddressed>
    recommended_action: <short imperative>
    evidence: <verification line reference or stage reference>
claim_verdicts: # Required when verification.md lists in-scope acceptance claims
  - id: <CLM-id from .filid/criteria.md>
    verdict: PASS | FAIL | INSUFFICIENT-EVIDENCE
    evidence: <artifact/test/line reference backing the verdict>
compromise_accepted: <true|false> # Optional — set when re-evaluating a VETO compromise
reasoning_gaps: [<free-form strings>] # Metrics the persona needed but could not find
---
```

> **Note**: `severity` on fix_items uses the UPPERCASE review/debt scale `CRITICAL|HIGH|MEDIUM|LOW` (SSoT: `src/types/debt.ts` → `DebtSeverity`). This is distinct from (a) rule severity `error|warning|info` (`src/types/rules.ts` → `RuleSeverity`, for static rule definitions) and (b) drift severity lowercase `critical|high|medium|low` (`src/types/drift.ts` → `DriftSeverity`, for sync output). The advisory mapping of this scale (LOW = advisory, >= MEDIUM = blocking) is defined in "Severity Gate & Finding Discipline" below.

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
- **`fix_items`** — structured findings. The chairperson deduplicates by
  `path + rule` across all personas (highest severity wins on collision,
  `confidence` as tiebreaker), then applies the severity gate: items at
  or above MEDIUM are promoted to `FIX-XXX` entries in
  `fix-requests.md`; LOW items route to the advisory channel
  (`review-report.md` → `## Advisory Notes`, `ADV-XXX`) and never block
  the verdict. `fix_items: []` with `state: SYNTHESIS` is a valid,
  successful opinion (null result) — see "Severity Gate & Finding
  Discipline" below.
- **`consequence`** (per fix_item, REQUIRED) — names the specific
  behavior, contract, metric, or guarantee that breaks if the item is
  left unaddressed. "Improves clarity/consistency" is not a consequence.
  A fix_item whose consequence cannot be concretely named is at most
  LOW.
- **`claim_verdicts`** — one entry per in-scope acceptance claim listed
  in `verification.md` → `## Acceptance Claims (in scope)`. `PASS`
  requires cited evidence; `FAIL` means the claim's expected outcome is
  observably broken; `INSUFFICIENT-EVIDENCE` means the claim cannot be
  judged from the available artifacts. Omit the field entirely when no
  in-scope claims exist. See "Acceptance Claims (criteria ledger)" below
  for aggregation and verdict folding.
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

## Severity Gate & Finding Discipline

Canonical definition — every persona agent file carries a compact copy
of these rules; this section is the source of truth when they drift.

### The gate

fix_items with severity `>= MEDIUM` are **blocking** — they are promoted
to `FIX-XXX` and a non-empty blocking set produces `REQUEST_CHANGES`.
`LOW` fix_items are **advisory** — they route to `review-report.md` →
`## Advisory Notes` and can never produce `REQUEST_CHANGES` on their
own. SYNTHESIS with an empty blocking set maps to `APPROVED` (presented
as **APPROVED (with notes)** when the advisory set is non-empty —
presentation only; the verdict enum is unchanged). The gate applies to
SYNTHESIS fix_items ONLY: VETO classes (circular dependency, hardcoded
secrets, security-critical bugs, irreversible destructive operations)
and the critical-security override are gate-independent.

### Null result is success

A rigorous sweep that surfaces zero at-or-above-gate findings is a
valid, successful outcome. The opinion body MUST state the surface
inspected in one line — `Checked: <files/contracts/paths>` — so a
formal zero is distinguishable from an unexamined zero. NEVER
manufacture, inflate, or pad findings: finding count is not a measure
of review quality; calibration is.

### Anti-inflation hard rules

Applied mechanically, regardless of how the consequence is narrated:

1. Style, formatting, naming-preference, comment-wording, and
   doc-phrasing findings → LOW.
2. Generic, unfalsifiable consequences ("may cause future bugs", "hurts
   maintainability", "could confuse readers") → demote to LOW.
3. A consequence built on a speculative chain of 2+ steps ("if X, then
   Y could, which might Z") → LOW.

**Under-classification exception**: when unclear wording or
documentation masks a requirement, contract, or security omission, the
finding is graded by the masked omission's consequence (cite the
concrete requirement/contract being masked), not by the wording itself.

These hard rules never reclassify calibrated mechanical thresholds —
DAG cycle, 3+12, LCOM4, CC, INTENT.md 50-line cap keep the severities
defined in each persona's Decision Criteria.

### No notes escape

Defect suspicion appears ONLY as a fix_item (with severity +
consequence). Narrative sections (opinion body, Perspective Sweep,
Evidence Trace) and `reasoning_gaps` MUST NOT carry hedged defect
language ("might be an issue", "consider improving") about items absent
from `fix_items`. If a suspicion does not merit a fix_item, it does not
merit prose — omit it. `reasoning_gaps` is reserved for missing
measurements, never for suspicions.

## Acceptance Claims (criteria ledger)

`.filid/criteria.md` is the project-level oracle ledger: PASS/FAIL-judgeable
claims harvested from spike branches by `/filid:harvest`. Phase D consumes
it as follows:

- **Scope filter (Step D.0)**: the chairperson loads the ledger from BOTH
  the base (`git show <BASE_REF>:.filid/criteria.md`, when present) and
  HEAD. The judged set = (claims `active` at base ∪ claims added in the
  diff with `active` status) whose `scope` path-prefix matches at least
  one diff-touched file. A claim transitioned out of `active` WITHIN the
  reviewed diff is therefore still judged in this review — a status flip
  cannot dodge the judgment it was failing; the transition is surfaced
  in `## Claim Verdicts` with a `transition:` note for human inspection.
  Claims already `superseded` / `retired` at base are never judged. The
  filtered set is written to `verification.md` →
  `## Acceptance Claims (in scope)` (the section says `none` when the
  ledger is absent or nothing matches).
- **Judgment**: every opinion (solo adjudicator or team persona) emits
  `claim_verdicts` for the in-scope set. The chairperson aggregates
  per-claim across **non-ABSTAIN** opinions with worst-wins ordering:
  `FAIL > INSUFFICIENT-EVIDENCE > PASS`. A claim missing from a
  non-ABSTAIN opinion counts as INSUFFICIENT-EVIDENCE from that persona;
  ABSTAIN opinions are excluded from claim aggregation exactly as they
  are excluded from the quorum denominator (otherwise one forced ABSTAIN
  would demote every claim and reintroduce the constant-REQUEST_CHANGES
  bias the severity gate removed).
- **Verdict folding (Step D.6.1)**: aggregated non-PASS claims synthesize
  blocking fix_items so the existing severity gate stays the single
  verdict function —
  - `FAIL` → `FIX-XXX` with `Severity: HIGH`, `Type: code-fix`,
    `Rule: <CLM-id>` (acceptance criterion observably broken).
  - `INSUFFICIENT-EVIDENCE` → `FIX-XXX` with `Severity: MEDIUM`,
    `Type: harvest-required`, `Rule: <CLM-id>` (oracle gap — not a code
    defect, never code-surgeon: on merge-track branches resolved by
    supplying the claim's `observable` evidence or a human-confirmed
    claim revision; on spike branches via `/filid:harvest`).
  - Downstream: resolve dispatches FAIL-derived `code-fix` items
    normally (and aborts on any `harvest-required`); revalidate
    re-judges `CLM-*` rows directly against the ledger instead of
    metric re-measurement (`skills/revalidate/SKILL.md` Step 6.4).
- **APPROVED therefore requires**: empty blocking set, which now implies
  _every in-scope active claim is PASS_ in addition to "no fix_item >=
  MEDIUM". Claims judged PASS appear in `review-report.md` →
  `## Claim Verdicts` for the audit trail.
- **Spike-branch demotion guard**: when the review target branch itself
  matches `spike/*` and no current harvest manifest exists
  (`.filid/harvest/<normalized>/manifest.json` with `head_sha` == current
  HEAD and `created_at` within 7 days), the review degrades to
  `REQUEST_CHANGES` with a single `harvest-required` fix item without
  running Phases A–D (see `SKILL.md` Step 1 and `templates.md` →
  "Harvest-Required Variant").

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

> **Terminology**: "fallback" in review refers to COVERAGE FALLBACK (when Phase D is skipped, main-context chairperson writes the minimal review-report.md). This is distinct from `ast-fallback`, which is DEGRADATION FALLBACK (LLM-based AST pattern matching when `@ast-grep/napi` native module is unavailable).

This fallback applies **only** to Phase A, B, C1, and C2. **Phase D is
excluded** from the chairperson-direct fallback path — main MUST NOT
fabricate a Phase D verdict when the A/B/C subagent fails. Instead, route
the failure through the `verdict_gate` rule in
`plugins/filid/skills/review/DETAIL.md` (`## API Contracts`) with
dispatch `fail` and verdict `INCONCLUSIVE`. See
`plugins/filid/skills/review/phases/phase-d-deliberation.md` Step D.7.

After each A/B/C subagent completes, verify its output file exists before
proceeding:

1. Check: Does `<REVIEW_DIR>/<expected_file>` exist? (Read or Glob)
2. If **yes** → proceed to next step.
3. If **no** → the subagent failed to write its A/B/C deliverable. Do NOT
   re-launch a subagent. Instead, read the A/B/C phase instructions file
   yourself and execute the steps directly as the chairperson. This is
   faster and more reliable than re-delegating.

Apply this verification to every delegated A/B/C phase (and no further):

| Phase | Expected output             |
| ----- | --------------------------- |
| A     | `structure-check.md`        |
| B     | `session.md`                |
| C1    | `verification-metrics.md`   |
| C2    | `verification-structure.md` |

For batched A/B/C phases (`changedFilesCount > 15`), verify every
`<base>.partial-<batchId>.md` file exists before merging. Missing partials
trigger the same chairperson-direct fallback on the missing batch only — do
not re-run successful batches. This batched fallback, too, applies only to
A/B/C1/C2.

### Config Patch Contract (`.filid/config.json` fixes)

Every Phase D fix whose Code Patch modifies `.filid/config.json` MUST
pass through `mcp_t_config_patch_validate` before being written to
`fix-requests.md`. The contract is:

| Field            | Direction            | Shape                                                    | Required           |
| ---------------- | -------------------- | -------------------------------------------------------- | ------------------ |
| `patch_json`     | main → tool (input)  | stringified JSON of the proposed `.filid/config.json`    | yes                |
| `source_context` | main → tool (input)  | free-form trace tag (persona id or FIX-id)               | no                 |
| `valid`          | tool → main (output) | `true` iff the patch passes `FilidConfigSchema` strictly | yes                |
| `errors`         | tool → main (output) | `{ path: string; message: string }[]` zod issues         | yes (may be empty) |
| `suggestion`     | tool → main (output) | JSON string of the sanitised patch that would pass       | iff recoverable    |

Dispatch rules are encoded in `phase-d-deliberation.md` Step D.6.4:

- `valid == true` → emit the fix unchanged.
- `valid == false ∧ suggestion != undefined` → rewrite Code Patch to
  `suggestion`, attach a `Validation Note:` that quotes `errors`.
- `valid == false ∧ suggestion == undefined` → mark the fix
  `Type: blocked`, body = `errors`, `Raised by: D.6.4 schema gate`.

### Phase D protocol violation (chairperson-direct synthesis forbidden)

A `chairperson-direct` Phase D synthesis — main writing a SYNTHESIS verdict
without running either the `team` dispatch (`TeamCreate` + N `Task`s) or the
`solo-adjudicator` dispatch (single `Task(filid:adjudicator)`) — is a
**protocol violation** (프로토콜 위반). Phase D runs only in the main
orchestrator, and only via one of those two sanctioned dispatches. Any
deviation yields `deliberation_mode == "chairperson-forbidden"` and the
`verdict_gate` MUST block the merge with `verdict: INCONCLUSIVE`.
