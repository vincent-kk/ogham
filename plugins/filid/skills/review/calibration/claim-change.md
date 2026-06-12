# run-d — Claim-Judgment Fixture (acceptance-criteria ledger)

> Calibrates the Phase D acceptance-claim channel (issue #67 wiring):
> in-scope `active` claims must be judged with evidence, a broken claim
> must fold into the blocking set, and a satisfied claim must not be
> demoted to FAIL / INSUFFICIENT-EVIDENCE. **MUST end
> `REQUEST_CHANGES`** with a `## Claim Verdicts` section containing
> exactly one PASS row and one FAIL row.

## 1. Materialization

Identical to `run-a` (base tree from `clean-change.md` §1, clean variant
from §2 — the diff itself is sound by construction), plus ONE extra file
committed on `main` BEFORE branching:

`.filid/criteria.md`:

```markdown
# Acceptance Criteria Ledger

Claims harvested from spike branches. Append-only: claims are never
deleted — supersede or retire them via the status field.

## CLM-001: slugify canonical hyphenation

- status: active
- scope: src/slugify
- claim: slugify lowercases input and joins non-alphanumeric runs with single hyphens, trimming edge hyphens
- observable: src/slugify/tests/slugify.spec.ts ("Hello World" case) and direct evaluation of src/slugify/slugify.ts
- expected: slugify('Hello World') returns 'hello-world'
- source: spike/slug-probe harvest 2026-06-01 (D-01)

## CLM-002: slugify diacritic transliteration

- status: active
- scope: src/slugify
- claim: slugify transliterates Latin diacritics to ASCII before hyphenation instead of dropping them
- observable: evaluation of slugify('Café au lait') against src/slugify/slugify.ts
- expected: slugify('Café au lait') returns 'cafe-au-lait'
- source: spike/slug-probe harvest 2026-06-01 (D-02)
```

Then `git checkout -b calib/run-d`, apply the clean variant
(`clean-change.md` §2), and commit. Run `/filid:review --solo --base
main` in a fresh session, exactly as for the other runs.

## 2. Answer Key

| Claim   | Ground truth                                                                                       | Required verdict |
| ------- | -------------------------------------------------------------------------------------------------- | ---------------- |
| CLM-001 | The implementation lowercases, hyphenates, trims — satisfied                                       | PASS             |
| CLM-002 | `é` matches `[^a-z0-9]` and becomes a hyphen: `slugify('Café au lait')` → `'caf-au-lait'` — broken | FAIL             |

Required artifacts:

- `verification.md` carries `## Acceptance Claims (in scope)` listing
  both claims (scope `src/slugify` intersects the changed file).
- The opinion carries a `claim_verdicts` block for BOTH claims, each
  with cited evidence.
- `fix-requests.md` contains the folded CLM-002 item: `Severity: HIGH`,
  `Type: code-fix`, `Rule: CLM-002`, `Source: acceptance-claim`.
- `review-report.md` carries `## Claim Verdicts` (CLM-001 PASS,
  CLM-002 FAIL) and `**Verdict**: REQUEST_CHANGES`.

## 3. Scoring (claim channel)

- **Claim false-PASS** — CLM-002 judged PASS (or never judged): the
  oracle channel missed a broken acceptance criterion. Expected: 0.
- **Claim false-FAIL** — CLM-001 judged FAIL or INSUFFICIENT-EVIDENCE:
  the channel manufactures blockers and APPROVED becomes unreachable on
  claim-bearing diffs. Expected: 0.
- INSUFFICIENT-EVIDENCE on CLM-002 counts as a half-miss: the verdict
  still blocks (folded MEDIUM harvest-required), but the broken claim
  was judgeable from the named observable — record it in the ledger
  notes.
