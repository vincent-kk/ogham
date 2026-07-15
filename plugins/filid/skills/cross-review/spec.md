# cross-review — Public Contract Specification

## Requirements

- Step sequence MUST match `SKILL.md`: Scope/Session → Evidence →
  Committee (single parallel round) → Arbitration/Verification →
  Report. All MCP measurement runs in the evidence subagent(s); the
  chairperson's only MCP calls beyond `review_manage` session ops are
  the bookkeeping pair (`config_patch_validate`, `debt_manage(create)`).
- **Artifact completeness sentinel.** `verification.md` is consumable
  only when its frontmatter `verification_passed` holds a real value —
  the streaming-write skeleton carries `PENDING` until the evidence
  phase finishes. A `PENDING` sentinel is treated as incomplete, never
  as an empty result. One fresh-subagent retry is allowed; a second
  failure pins the verdict to `INCONCLUSIVE`.
- Committee opinions are collected in ONE round of parallel foreground
  `Agent` calls. There is no multi-round debate: cross-persona
  disagreement is arbitrated by the verification pass. A failed persona
  becomes a chairperson-written forced ABSTAIN; more than half failed
  (or a failed solo adjudicator) pins the verdict to `INCONCLUSIVE`.
- Every blocking candidate (severity >= MEDIUM) and every VETO basis
  MUST pass the adversarial verification pass before verdict
  derivation (`contracts.md` → "Verifier Verdict Ladder"). REFUTED
  candidates are dismissed and recorded in the Arbitration Log — they
  never reach `fix-requests.md`. Advisory (LOW) items skip
  verification and never block.
- Verdict derivation MUST follow `contracts.md` → "Verdict Derivation":
  only the surviving blocking set produces `REQUEST_CHANGES`; VETO
  classes and the critical-security override are gate-independent; a
  verdict written without committee opinions on disk is a protocol
  violation (only `INCONCLUSIVE` is legal in that state).
- Every fix_item MUST carry a `consequence`; no concrete consequence →
  at most LOW. A null result (`fix_items: []` with SYNTHESIS) is a
  valid success and MUST cite the checked surface.
- When `.filid/criteria.md` holds `active` claims whose `scope`
  intersects the diff, every opinion MUST judge them
  (PASS / FAIL / INSUFFICIENT-EVIDENCE, worst-wins aggregation) and
  non-PASS aggregates fold into the blocking set (FAIL → HIGH
  `code-fix`; INSUFFICIENT-EVIDENCE → MEDIUM `harvest-required`).
  `APPROVED` therefore implies all in-scope active claims are PASS.
- Reviews targeting a `spike/*` branch without a current harvest
  manifest MUST skip all steps and emit the Harvest-Required Variant
  (`templates.md`) with `verdict: REQUEST_CHANGES`.
- Any change to verdict derivation, severity anchoring, or finding
  discipline under `skills/cross-review/**` or `agents/*.md` MUST be
  followed by a calibration pass (`calibration/calibration.md`).
- Output artifacts live under `.filid/review/<normalized-branch>/`:
  `session.md`, `verification.md`, `opinions/<persona-id>.md`,
  `review-report.md`, `fix-requests.md`, `content-hash.json`. The
  advisory ledger lives at `.filid/review/advisory-ledger.md` (outside
  per-branch cleanup scope).

## API Contracts

### review-report.md frontmatter (mandatory)

| Field          | Type                                          | Required | Consumer                           |
| -------------- | --------------------------------------------- | -------- | ---------------------------------- |
| `verdict`      | `APPROVED \| REQUEST_CHANGES \| INCONCLUSIVE` | yes      | pipeline verdict branch, PR format |
| `branch`       | string                                        | yes      | revalidate                         |
| `base_ref`     | string                                        | yes      | revalidate                         |
| `run_id`       | `<normalized>@<short sha>`                    | yes      | advisory-ledger once-per-run guard |
| `committee`    | `PersonaId[]`                                 | yes      | audit trail                        |
| `generated_at` | ISO-8601 string                               | yes      | freshness check                    |

Writers MUST emit all required fields. Readers (pipeline, revalidate)
grep-parse them; a missing `verdict` is treated as `INCONCLUSIVE`.

### Opinion & verdict schemas

The opinion frontmatter schema, severity gate, verifier verdict ladder,
verdict derivation table, and acceptance-claim folding rules are
specified in `contracts.md` — this file does not duplicate them.

### fix-requests.md consumers

`resolve` parses fix items by `FIX-XXX` heading with the field list in
`templates.md` (Type tokens are bare words; `harvest-required` aborts
resolve). `revalidate` re-derives each accepted fix's rule state via
MCP re-measurement, and `CLM-*` rules via direct claim re-judgment.
Format changes here require a synchronized update of both skills.
