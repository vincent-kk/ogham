# prawf Calibration — Reviewer Regression Fixtures

> The verifier itself is under regression test. These fixtures measure the review pipeline's **false-positive rate
> (FPR)** — blocking a paper that is sound by construction — and **false-negative rate (FNR)** — missing a defect that
> was deliberately seeded. Run a calibration pass after any change to `skills/peer-review/**` or `agents/*.md` that touches
> finding discipline, severity anchoring, or verdict derivation ([orchestration §4.2 / §4.5](../orchestration.md)).

## 1. Fixtures

| File                | Role                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------ |
| `clean-paper.md`    | Synthetic mini-paper, sound by construction — a clean run MUST end `prawf verdict: accept` |
| `mutated-paper.md`  | The same paper with five seeded defects — expected detections per `seeded-defects.md`      |
| `seeded-defects.md` | Answer-key manifest (defect id, location hint, expected axis/severity, fatal-flaw flag)    |

Both papers are **fully synthetic**: every author, citation, registration id, and repository link is fictional and
resolves nowhere. Run calibration without external verification (the [orchestration §8](../orchestration.md)
degradation path) — a clean-run Accept is normally a provisional-accept (`external_verification: unavailable`) and
still terminates with `prawf verdict: accept`. An unresolvable fictional link is NOT a finding.

## 2. Running a Pass

**Copy ONLY the paper file into a scratch workdir** so reviewers cannot glob the manifest or the twin paper — a
reviewer that can read `seeded-defects.md` (or diff the twins) is not being tested:

```bash
# <plugin-root> = this plugin's root (the directory containing .claude-plugin/plugin.json) — resolve via Glob.
# <date>        = one run id (e.g. 2026-06-11) substituted consistently in EVERY command of this pass.
mkdir -p /tmp/prawf-calib/<date>/clean /tmp/prawf-calib/<date>/mutated
cp <plugin-root>/skills/peer-review/calibration/clean-paper.md /tmp/prawf-calib/<date>/clean/
cp <plugin-root>/skills/peer-review/calibration/mutated-paper.md /tmp/prawf-calib/<date>/mutated/
```

1. **Clean run** — `/prawf:peer-review --solo --workdir /tmp/prawf-calib/<date>/clean/.prawf
/tmp/prawf-calib/<date>/clean/clean-paper.md` — pass the copied paper path explicitly (P0 yields to ask the user
   when no paper is given). MUST end `prawf verdict: accept`. Below-gate advisory items are allowed — an
   "Accept (with notes)" still passes.
2. **Mutation run** — `/prawf:peer-review --solo --workdir /tmp/prawf-calib/<date>/mutated/.prawf
/tmp/prawf-calib/<date>/mutated/mutated-paper.md`. Expected: the five detections listed in
   `seeded-defects.md`, ending `prawf verdict: reject` (two fatal-flaw criticals — gate-independent, per
   [orchestration §4.3 / §4.5](../orchestration.md)).

> Isolation is **behavioral, not filesystem-level**: reviewer personas retain Read/Glob capability and could in
> principle open the fixtures at their source path. The calibration measures whether personas follow their evidence
> discipline under instruction — not whether cheating is technically impossible.

Run at the default gate (`major`) unless the regression under test concerns another gate. Team mode (without
`--solo`) may be used for a fuller pass and is scored identically.

## 3. Scoring

- **FP (false positive)** = any at-or-above-gate finding raised on the **clean paper**. Expected count: **0**.
  Below-gate advisory findings on the clean paper are NOT FPs — they cannot move the verdict.
- **FN (false negative)** = a seeded defect not surfaced at its expected severity. **± one severity step is
  tolerated** (an expected `major` surfaced as `critical` or `minor` still counts as detected); a defect not surfaced
  at all is an FN. **Fatal-flaw classes must be exact**: SD-1 and SD-2 must surface as `critical` with the correct
  fatal-flaw class (Temporality; p-hacking + preregistration mismatch) — anything less is an FN.
- Expected axis is a dedup-ownership hint ([orchestration §4.1](../orchestration.md)); a seeded defect surfaced on an
  adjacent convened axis still counts as detected.
- Unseeded extra findings on the **mutated** paper are not scored — FPs are counted on the clean run only.
- A clean run ending in anything other than `accept`, or a mutation run ending in anything other than `reject`, is a
  regression even when the FP/FN counts look acceptable.

## 4. Regression Ledger

Record one row per calibration pass (clean run + mutation run), newest last:

| date       | runner                | gate  | FP count | FN count | verdict (clean / mutated) | notes |
| ---------- | --------------------- | ----- | -------- | -------- | ------------------------- | ----- |
| <ISO 8601> | <model or session id> | major | 0        | 0        | accept / reject           | —     |
