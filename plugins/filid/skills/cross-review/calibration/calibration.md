# Filid Cross-Review Calibration

These fixtures regression-test FCA finding scope, arbitration, and verdict
derivation. Reviewers must never read this directory during a calibration run.

## Fixtures

| Run     | Fixture              | Expected verdict  | Purpose                                            |
| ------- | -------------------- | ----------------- | -------------------------------------------------- |
| `run-a` | `clean-change.md`    | `APPROVED`        | Sound contract, structure, and verification change |
| `run-b` | `low-only-change.md` | `REQUEST_CHANGES` | One canonical warning remains actionable           |
| `run-c` | `seeded-change.md`   | `REQUEST_CHANGES` | Seeded organ and external-boundary errors          |
| `run-d` | `contract-change.md` | `REQUEST_CHANGES` | Public entry and DETAIL API disagree               |

`seeded-violations.md` is the answer key for runs b, c, and d.

## Materialization

For each run, create a separate scratch repository:

1. Create `/tmp/filid-calibration/<pass>/<run>/`.
2. Initialize `main`, materialize the base tree from `clean-change.md`, and
   commit it.
3. Create branch `calib/<run>`, apply only that run's changed files, and commit.
4. Start a fresh session at the scratch root.
5. Run `/filid:cross-review --base main`.

Do not copy calibration documents into the scratch repository. The session that
creates a fixture must not run its review because it already knows the answer.
Keep the working tree clean so review-state and snapshot evidence describe the
same committed content.

## Scoring

- A confirmed finding on `run-a` is a false positive.
- Missing the warning on `run-b` is a warning-channel false negative.
- Missing either seeded error on `run-c` is a false negative.
- Missing the documented API mismatch on `run-d` is a contract false negative.
- A candidate correctly refuted by the adversarial reviewer is not a false
  positive.
- Any `INCONCLUSIVE` result must name an actual missing evidence source; using it
  to avoid a judgeable fixture is a regression.
- Every final report must contain all three perspective rows and an adversarial
  decision for each candidate.

Expected counts per complete pass: false positives `0`, false negatives `0`,
unjustified inconclusive results `0`.

## Regression Ledger

| Date       | Runner             | FP  | FN  | Unjustified Inconclusive | Verdicts a/b/c/d                                               | Notes |
| ---------- | ------------------ | --- | --- | ------------------------ | -------------------------------------------------------------- | ----- |
| <ISO-8601> | <model or session> | 0   | 0   | 0                        | APPROVED / REQUEST_CHANGES / REQUEST_CHANGES / REQUEST_CHANGES | —     |
