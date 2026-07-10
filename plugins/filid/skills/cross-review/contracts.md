# cross-review — Data Contracts & Meta Rules

Schemas and rules governing committee composition, opinion files,
verification verdicts, verdict derivation, and subagent prompts.
SKILL.md and the agent files reference this document rather than
duplicating the contracts inline.

## Committee → Agent File Mapping

Each `PersonaId` from `src/types/review.ts` corresponds to exactly one
agent file under `../../agents/`:

| PersonaId               | Agent file                        | Perspective                     | Election tier             |
| ----------------------- | --------------------------------- | ------------------------------- | ------------------------- |
| `adjudicator`           | `agents/adjudicator.md`           | Integrated fast-path (6 lenses) | `TRIVIAL` / `--solo` only |
| `engineering-architect` | `agents/engineering-architect.md` | Structure                       | LOW / MEDIUM / HIGH       |
| `knowledge-manager`     | `agents/knowledge-manager.md`     | Documentation                   | MEDIUM / HIGH             |
| `operations-sre`        | `agents/operations-sre.md`        | Stability                       | LOW / MEDIUM / HIGH       |
| `business-driver`       | `agents/business-driver.md`       | Velocity                        | MEDIUM / HIGH             |
| `product-manager`       | `agents/product-manager.md`       | User value                      | HIGH                      |
| `design-hci`            | `agents/design-hci.md`            | Cognitive load                  | HIGH                      |

All seven agents have scoped tool access (`Read, Write, Glob, Grep,
Bash`). `Write` is used exclusively to author their
`opinions/<persona-id>.md` file; `Edit` is deliberately absent. They are
spawned as parallel foreground `Agent(subagent_type: filid:<id>)` calls
by SKILL.md Step 3 — never as background teammates, never with
orchestration tools.

Adding a new specialist persona requires a coordinated edit in three
places:

1. `src/types/review.ts` — add the ID to the `PersonaId` union
2. `src/mcp/tools/reviewManage/handlers/electCommittee.ts` — add to the
   committee arrays (LOW / MEDIUM / HIGH)
3. `plugins/filid/agents/<id>.md` — create the agent file with the
   Opinion Frontmatter Contract

Do NOT add new personas to the TRIVIAL tier — it is reserved for the
integrated `adjudicator` fast path.

## Complexity → Committee Mapping

| Complexity | Committee (canonical)                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| TRIVIAL    | `[adjudicator]`                                                                                            |
| LOW        | `[engineering-architect, operations-sre]`                                                                  |
| MEDIUM     | `[engineering-architect, knowledge-manager, business-driver, operations-sre]`                              |
| HIGH       | `[engineering-architect, knowledge-manager, operations-sre, business-driver, product-manager, design-hci]` |

This table mirrors `mcp__plugin_filid_t__review_manage(elect-committee)`
output and is the sole reference for chairperson-side committee rewrites
(the Step 2 escalation). Keep in sync with
`src/mcp/tools/reviewManage/handlers/electCommittee.ts`.

## Document Change Signal

`hasDocumentChanges` (input to `elect-committee`) is computed as:

```bash
git diff --name-only <BASE_REF>..HEAD | grep -E '(/|^)(INTENT|DETAIL)\.md$' >/dev/null
# exit 0 → hasDocumentChanges: true
# exit 1 → hasDocumentChanges: false
# uninspectable diff → true (fail-safe toward knowledge-manager inclusion)
```

When `true` AND complexity is `LOW`, the committee includes
`knowledge-manager` (3-member LOW) so documentation-rule findings cannot
pass unreviewed by a documentation expert.

## Opinion Frontmatter Contract

Every `<REVIEW_DIR>/opinions/<persona-id>.md` file MUST begin with this
YAML frontmatter. The chairperson grep-parses these fields in Step 4.

```yaml
---
persona: <PersonaId>
state: SYNTHESIS | VETO | ABSTAIN
confidence: <0.0-1.0>
fix_items:
  - severity: CRITICAL | HIGH | MEDIUM | LOW
    source: structure | code-quality
    type: code-fix | promote | restructure
    path: <file path>
    rule: <violated rule id>
    current: <measured value>
    consequence: <what concretely breaks if left unaddressed>
    recommended_action: <short imperative>
    evidence: <verification.md line reference or inspected source line>
claim_verdicts: # Required when verification.md lists in-scope acceptance claims
  - id: <CLM-id from .filid/criteria.md>
    verdict: PASS | FAIL | INSUFFICIENT-EVIDENCE
    evidence: <artifact/test/line reference backing the verdict>
reasoning_gaps: [<measurements needed but not found>]
---
```

Field semantics:

- **`state`** — `SYNTHESIS` (agreement, with or without fix_items),
  `VETO` (hard block; requires a VETO-class basis cited in the body),
  `ABSTAIN` (insufficient information; excluded from claim aggregation).
  Solo (adjudicator) opinions prohibit `ABSTAIN`. There is no round 2 —
  disagreement is arbitrated by the verification pass, not by debate.
- **`confidence`** — tiebreaker when deduplicating fix_items.
- **`consequence`** (REQUIRED per fix_item) — names the specific
  behavior, contract, metric, or guarantee that breaks.
  "Improves clarity/consistency" is not a consequence. A fix_item whose
  consequence cannot be concretely named is at most LOW.
- **`fix_items: []` with `state: SYNTHESIS`** is a valid, successful
  opinion (null result) — the body MUST cite the checked surface
  (`Checked: <files/contracts/paths>`).
- **`reasoning_gaps`** — missing measurements only, never suspicions.
- **Forced ABSTAIN**: when a persona Agent fails, the chairperson writes
  a synthetic opinion with `state: ABSTAIN`, `confidence: 0`,
  `reasoning_gaps: ["worker failed"]`.

> `severity` uses the UPPERCASE review/debt scale
> `CRITICAL|HIGH|MEDIUM|LOW` (SSoT: `src/types/debt.ts` →
> `DebtSeverity`) — distinct from rule severity `error|warning|info` and
> lowercase drift severity.

## Severity Gate & Finding Discipline

Canonical definition — every persona agent file carries a compact copy;
this section is the source of truth when they drift.

### The gate

fix_items with severity `>= MEDIUM` are **blocking** — survivors of the
verification pass are promoted to `FIX-XXX` and a non-empty surviving
blocking set produces `REQUEST_CHANGES`. `LOW` fix_items are
**advisory** — they route to `review-report.md` → `## Advisory Notes`
(`ADV-XXX`), skip verification, and can never block. SYNTHESIS with an
empty blocking set maps to `APPROVED` (presented as **APPROVED (with
notes)** when advisories exist — presentation only). The gate applies to
SYNTHESIS fix_items ONLY: VETO classes (circular dependency, hardcoded
secrets, security-critical bugs, irreversible destructive operations)
and the critical-security override are gate-independent.

### Null result is success

A rigorous sweep surfacing zero at-or-above-gate findings is a valid,
successful outcome. The opinion body MUST state the inspected surface in
one line — `Checked: <files/contracts/paths>`. NEVER manufacture,
inflate, or pad findings: finding count is not a measure of review
quality; calibration is.

### Anti-inflation hard rules

Applied mechanically, regardless of how the consequence is narrated:

1. Style, formatting, naming-preference, comment-wording, and
   doc-phrasing findings → LOW.
2. Generic, unfalsifiable consequences ("may cause future bugs", "hurts
   maintainability") → LOW.
3. A consequence built on a speculative chain of 2+ steps → LOW.

**Under-classification exception**: when unclear wording masks a
requirement, contract, or security omission, grade by the masked
omission's consequence (cite the concrete requirement being masked).

These hard rules never reclassify calibrated mechanical thresholds —
DAG cycle, 3+12, LCOM4, CC, INTENT.md 50-line cap keep the severities
defined in each persona's Decision Criteria.

### No notes escape

Defect suspicion appears ONLY as a fix_item. Narrative sections and
`reasoning_gaps` MUST NOT carry hedged defect language about items
absent from `fix_items`. If a suspicion does not merit a fix_item, omit
it.

## Verifier Verdict Ladder

The Step 4 verification pass is the arbitration mechanism: it resolves
cross-persona disagreement and removes false positives. One
`general-purpose` verifier Agent per file group receives the diff, the
relevant file(s), and the candidate list, and returns exactly one
verdict per candidate:

- **CONFIRMED** — can name the inputs/state that trigger the failure and
  the wrong outcome. Quote the line.
- **PLAUSIBLE** — the mechanism is real, the trigger is uncertain
  (timing, env, config). State what would confirm it. Default to
  PLAUSIBLE when the state is realistic — do not refute a candidate
  merely for being "speculative".
- **REFUTED** — only when constructible from the code or the rules:
  factually wrong (quote the actual line); provably impossible
  (type/constant/invariant — show it); already guarded (cite the
  guard); or a rule misapplication (quote the rule scope — e.g.
  INTENT.md's 50-line cap does not apply to DETAIL.md).

Ground-truth rule: tool-measured metric rows in `verification.md`
(LCOM4, CC, 3+12 counts, dependency cycles) are facts — verifiers judge
misapplication, misattribution, and consequence realism; they never
re-measure or dispute measured values.

Disposition: CONFIRMED and PLAUSIBLE survive; REFUTED is dismissed and
recorded in the Arbitration Log with the refuting evidence. A VETO whose
entire cited basis is REFUTED is dismissed; otherwise the VETO stands.

## Verdict Derivation

Applied by the chairperson after the verification pass, in order:

| Condition                                                                  | Verdict           |
| -------------------------------------------------------------------------- | ----------------- |
| Solo adjudicator failed, or > 1/2 of the committee failed (forced ABSTAIN) | `INCONCLUSIVE`    |
| Evidence unavailable (verification.md incomplete after one retry)          | `INCONCLUSIVE`    |
| Standing (non-dismissed) VETO                                              | `REQUEST_CHANGES` |
| Critical-security override (below)                                         | `REQUEST_CHANGES` |
| Surviving blocking set non-empty                                           | `REQUEST_CHANGES` |
| Surviving blocking set empty                                               | `APPROVED`        |

**Critical-security override**: any surviving fix_item with
`severity: CRITICAL` and a security rule (`hardcoded-secret`,
`injection`, `auth-bypass`) forces `REQUEST_CHANGES` regardless of
committee states; the Arbitration Log records
`critical_security_override: true`.

`APPROVED` additionally implies every in-scope acceptance claim is PASS
(non-PASS claims fold into the blocking set — see below).

## Acceptance Claims (criteria ledger)

`.filid/criteria.md` is the project-level oracle ledger: PASS/FAIL-
judgeable claims harvested from spike branches by `/filid:harvest`.

- **Scope filter (evidence phase)**: the evidence agent loads the ledger
  from BOTH the base (`git show <BASE_REF>:.filid/criteria.md`, when
  present) and HEAD. Judged set = (claims `active` at base ∪ claims
  added in the diff with `active` status) whose `scope` path-prefix
  matches at least one changed file. A claim flipped out of `active`
  within the reviewed diff stays in the judged set (a status flip cannot
  dodge the judgment); annotate it `transition: active → <new status>`.
  The filtered set is written to `verification.md` →
  `## Acceptance Claims (in scope)` (`none` when empty).
- **Judgment**: every opinion emits `claim_verdicts` for the in-scope
  set. `PASS` requires cited observable evidence; never PASS on
  plausibility — use `INSUFFICIENT-EVIDENCE` when artifacts cannot
  decide.
- **Aggregation & folding (Step 4)**: per-claim worst-wins across
  non-ABSTAIN opinions (`FAIL > INSUFFICIENT-EVIDENCE > PASS`; a claim
  missing from a non-ABSTAIN opinion counts as INSUFFICIENT-EVIDENCE
  from that persona). Fold non-PASS aggregates into the blocking set
  BEFORE verification: `FAIL` → HIGH `code-fix`, `Rule: <CLM-id>`
  (verified like any blocking item — the verifier re-checks the claim's
  `observable` against `expected`); `INSUFFICIENT-EVIDENCE` → MEDIUM
  `harvest-required`, `Rule: <CLM-id>` (oracle gap — never dispatched to
  code-surgeon; skips verification since it asserts absence of
  evidence).
- Downstream: `resolve` aborts on any `harvest-required` item;
  `revalidate` re-judges `CLM-*` rows directly against the ledger.

## Subagent Prompt Rules

When constructing evidence / persona / verifier prompts:

1. **State the output file (or return shape) first.**
2. **Substitute concrete values** for every placeholder (`REVIEW_DIR`,
   `PROJECT_ROOT`, `BASE_REF`, ...) — never pass variable names for the
   subagent to resolve.
3. **Include the resolved instruction-file path** when one applies
   (`phases/evidence.md`).
4. **Pass the language setting** from the `[filid:lang]` tag (default
   English); technical terms, identifiers, rule IDs, and paths stay in
   original form.
5. **Close with the write-before-finish reminder**, including the
   partial-results fallback ("if budget runs low, write the file with
   what you have; mark skipped stages SKIP").

## Config Patch Contract (`.filid/config.json` fixes)

Every fix whose Code Patch modifies `.filid/config.json` MUST pass
through `mcp__plugin_filid_t__config_patch_validate` before being
written to `fix-requests.md`:

| Result                                 | Action                                                                                 |
| -------------------------------------- | -------------------------------------------------------------------------------------- |
| `valid == true`                        | Emit the fix unchanged                                                                 |
| `valid == false`, `suggestion` present | Rewrite the Code Patch to `suggestion`; append a `Validation Note:` quoting `errors[]` |
| `valid == false`, no `suggestion`      | Mark the fix `Type: blocked`; body = `errors[]`; add `Raised by: config schema gate`   |

This gate guarantees hallucinated config keys never reach `resolve` —
the failure class that produces no-op config commits.

## Chairperson Constraints

- The chairperson makes NO MCP measurement calls — all metrics come from
  `verification.md`. The only sanctioned chairperson MCP calls are
  bookkeeping: `config_patch_validate` (gate above) and
  `debt_manage(create)` (advisory promotion).
- The chairperson writes `session.md`, merged `verification.md` (split
  path only), forced-ABSTAIN opinions, `review-report.md`,
  `fix-requests.md`, and the advisory ledger. Personas write only their
  own opinion file.
- A verdict without committee opinions on disk is a protocol violation —
  the only legal verdict in that state is `INCONCLUSIVE`.
