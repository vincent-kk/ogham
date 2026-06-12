# filid Review Calibration — Verdict Regression Fixtures

> The verifier itself is under regression test. These fixtures measure the
> review pipeline's **false-positive rate (FPR)** — blocking a change that is
> sound by construction — its **false-negative rate (FNR)** — missing a defect
> that was deliberately seeded — and its **severity-inflation rate** — items
> that must stay LOW (advisory) being promoted to MEDIUM or above. Run a
> calibration pass after any change to `skills/review/**` or `agents/*.md`
> that touches finding discipline, severity anchoring, or verdict derivation
> (see `../DETAIL.md` → Requirements).

## 1. Fixtures

Run ids are deliberately neutral (`run-a` / `run-b` / `run-c`): the branch
name reaches the reviewer through `session.md` and every review artifact
path, so variant-revealing names ("clean", "seeded") would leak the
expected outcome and contaminate the FPR/FNR measurement. The run-id ↔
variant mapping below lives ONLY in the calibration docs, which reviewers
never read.

| Run id  | File                   | Role                                                                                                                                                      |
| ------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `run-a` | `clean-change.md`      | Base fixture tree + a clean one-file change, sound by construction — MUST end `APPROVED`                                                                  |
| `run-b` | `low-only-change.md`   | The same change carrying only golden-LOW items — MUST end `APPROVED` with a `## Advisory Notes` section                                                   |
| `run-c` | `seeded-change.md`     | The same change with seeded blocking defects + golden-LOW items — MUST end `REQUEST_CHANGES`                                                              |
| `run-d` | `claim-change.md`      | The clean change plus a committed criteria ledger (one satisfied claim, one broken) — MUST end `REQUEST_CHANGES` with one PASS and one FAIL claim verdict |
| —       | `seeded-violations.md` | Answer-key manifest (defect id, location hint, expected lens/severity, VETO-class flag, golden-LOW set)                                                   |

The fixture module is **fully synthetic**: the package, the module, and the
secret-looking constant are fictional and resolve nowhere. An unused constant
does NOT downgrade the seeded secret — a committed credential is the
violation regardless of use.

## 2. Running a Pass

**Materialize each run in its own scratch git repository** so reviewers
cannot glob the manifest or the sibling variants — a reviewer that can read
`seeded-violations.md` (or diff the variants) is not being tested:

1. Create `/tmp/filid-calib/<date>/<run-id>/` (`<run-id>` ∈ `run-a |
run-b | run-c`; `<date>` = one pass id, e.g. `2026-06-12`, substituted
   consistently across the pass).
2. `git init -b main`, then write the **base tree** from `clean-change.md`
   §1 (including `.filid/config.json`) and commit on `main`.
3. `git checkout -b calib/<run-id>`, overwrite `src/slugify/slugify.ts`
   with the variant for that run id (`run-a`: `clean-change.md` §2,
   `run-b`: `low-only-change.md`, `run-c`: `seeded-change.md`), and commit.
4. **In a fresh session opened at the scratch repo root**, run
   `/filid:review --solo --base main`.

**Session separation is mandatory**: the session that materialized the
fixtures has the expected outcomes in context (every variant doc states its
required verdict). The review MUST run in a separate session that has not
read any `calibration/` doc — the chairperson applies the severity gate and
writes the verdict, so a contaminated main context invalidates the pass,
even though the adjudicator subagent itself spawns fresh.

Copy ONLY the file contents listed in the fixture docs into the scratch repo
— never `seeded-violations.md` or the other variants. Isolation is
**behavioral, not filesystem-level**: personas retain Read/Glob capability
and could in principle open the fixtures at their source path. The
calibration measures whether reviewers follow their evidence discipline
under instruction — not whether cheating is technically impossible.

Each scratch repo gets its own `.filid/review/` (including its own advisory
ledger) — calibration runs never touch a real project's review artifacts.

### Expected terminal outcomes

| Run     | Verdict           | Additional requirement                                                                                                                                                 |
| ------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `run-a` | `APPROVED`        | empty (or absent) Advisory Notes is fine; **0 blocking findings**                                                                                                      |
| `run-b` | `APPROVED`        | `## Advisory Notes` present and non-empty; presented as APPROVED (with notes)                                                                                          |
| `run-c` | `REQUEST_CHANGES` | SV-1 surfaces as CRITICAL/VETO at any gate (VETO classes are gate-independent)                                                                                         |
| `run-d` | `REQUEST_CHANGES` | `## Claim Verdicts` with CLM-001 PASS + CLM-002 FAIL; folded HIGH `Rule: CLM-002` in fix-requests (see `claim-change.md` §3 for claim false-PASS / false-FAIL scoring) |

## 3. Scoring

- **FP (false positive)** = any blocking finding (severity >= MEDIUM) raised
  on `run-a`. Expected count: **0**. Advisory (LOW) findings on `run-a` are
  NOT FPs — they cannot move the verdict.
- **FN (false negative)** = a seeded defect (`SV-*`) not surfaced per
  `seeded-violations.md`. **One severity step above is tolerated** (an
  expected MEDIUM surfaced as HIGH still counts as detected); surfacing
  BELOW the gate (LOW) or not at all is an FN. **VETO classes must be
  exact**: SV-1 must surface as CRITICAL with `state: VETO` — anything less
  is an FN.
- **Severity inflation** = any golden-LOW item (`GL-*`) surfaced at MEDIUM
  or above, on ANY run — AND any non-VETO-class seeded defect surfaced
  **two or more steps above** its expected severity (e.g. an expected
  MEDIUM surfaced as CRITICAL or escalated to VETO). Expected count: **0**.
- **Per item**, a golden-LOW item surfaced at LOW or not surfaced at all
  both pass — LOW noise is never obligatory item-by-item. **Run-level
  exception**: `run-b` MUST surface at least one `GL-*` item at LOW. That
  run exists to exercise the advisory channel — zero advisories there
  cannot distinguish "gate routes LOW to Advisory Notes" from "gate
  silently swallows LOW", so it is scored as a regression, not as
  restraint.
- Expected lens is a routing hint; a seeded defect surfaced under an
  adjacent lens still counts as detected. Severity (and the VETO class for
  SV-1) is what is scored.
- Unseeded extra findings on `run-c` are not scored — FPs are counted on
  `run-a` only.
- A `run-a` or `run-b` ending in anything other than `APPROVED`, a `run-b`
  without Advisory Notes, or a `run-c` ending in anything other than
  `REQUEST_CHANGES`, is a regression even when the FP/FN/inflation counts
  look acceptable.

## 4. Regression Ledger

Record one row per calibration pass (all three runs), newest last:

| date       | runner                | FP  | FN  | inflation | verdicts (run-a / run-b / run-c)                   | notes |
| ---------- | --------------------- | --- | --- | --------- | -------------------------------------------------- | ----- |
| <ISO 8601> | <model or session id> | 0   | 0   | 0         | APPROVED / APPROVED (with notes) / REQUEST_CHANGES | —     |
