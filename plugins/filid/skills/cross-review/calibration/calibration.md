# Filid Cross-Review Calibration

These fixtures regression-test FCA finding scope, arbitration, and verdict derivation. Reviewers must never read this directory during a calibration run.

## Fixtures

| Run     | Fixture                     | Expected verdict  | Purpose                                            |
| ------- | --------------------------- | ----------------- | -------------------------------------------------- |
| `run-a` | `clean-change.md`           | `APPROVED`        | Sound contract, structure, and verification change |
| `run-b` | `low-only-change.md`        | `REQUEST_CHANGES` | One canonical warning remains actionable           |
| `run-c` | `seeded-change.md`          | `REQUEST_CHANGES` | Seeded organ and external-boundary errors          |
| `run-d` | `contract-change.md`        | `REQUEST_CHANGES` | Public entry and DETAIL API disagree               |
| `run-e` | `gap-covered-by-finding.md` | `REQUEST_CHANGES` | Measured opacity is a finding, not a gap           |
| `run-f` | `genuine-gap.md`            | `INCONCLUSIVE`    | Absent evidence still suspends the verdict         |
| `run-g` | `out-of-scope-certainty.md` | `APPROVED`        | Out-of-scope certainty never reaches the verdict   |

`seeded-violations.md` is the answer key for runs b through g.

Runs e, f, and g form one set: e proves the coverage exception fires, f proves it does not over-fire, g proves the scope gate is independent of both. Running e without f certifies half a change.

## Materialization

For each run, create a separate scratch repository:

1. Create `/tmp/filid-calibration/<pass>/<run>/`.
2. Initialize `main`, materialize the base tree from `clean-change.md`, and commit it.
3. Confirm `structure_validate` over the base commit reports zero violations. A non-zero count means the tree was materialized wrong; fix it before branching, because every such row lands in scope for the branch and corrupts the run.
4. Create branch `calib/<run>`, apply only that run's changed files, and commit.
5. Start a fresh session at the scratch root.
6. Run `/filid:cross-review --base main`.

`run-g` alters step 2: its fixture adds files to `main` before the base commit, and its branch carries only the clean change. Read `out-of-scope-certainty.md` before materializing it — putting those files on the branch instead destroys what the fixture measures. Its step 3 expects four rows rather than zero, all out of scope and all enumerated in that fixture.

Do not copy calibration documents into the scratch repository. The session that creates a fixture must not run its review because it already knows the answer. Keep the working tree clean so review-state and snapshot evidence describe the same committed content.

## Scoring

- A confirmed finding on `run-a` or `run-g` is a false positive.
- Missing the warning on `run-b` is a warning-channel false negative.
- Missing either seeded error on `run-c` is a false negative.
- Missing the documented API mismatch on `run-d` is a contract false negative.
- Missing the `entry-point-surface` warning on `run-e` is a false negative; ending it `INCONCLUSIVE` while carrying that confirmed finding is an unjustified inconclusive.
- Ending `run-f` anything but `INCONCLUSIVE` is a suppressed-gap regression — the opposite failure, and the one the coverage exception risks.
- A candidate correctly refuted by the adversarial reviewer is not a false positive.
- Any `INCONCLUSIVE` result must name an actual missing evidence source; using it to avoid a judgeable fixture is a regression. A gap recorded on the same `path + rule` as a confirmed finding is not a missing evidence source.
- Every final report must contain all three perspective rows and an adversarial decision for each candidate.

Expected counts per complete pass: false positives `0`, false negatives `0`, unjustified inconclusive results `0`, suppressed gaps `0`.

## Regression Ledger

| Date       | Runner             | FP  | FN  | Unjustified Inconclusive | Suppressed Gaps | Verdicts a/b/c/d/e/f/g                                                                                     | Notes |
| ---------- | ------------------ | --- | --- | ------------------------ | --------------- | ---------------------------------------------------------------------------------------------------------- | ----- |
| <ISO-8601> | <model or session> | 0   | 0   | 0                        | 0               | APPROVED / REQUEST_CHANGES / REQUEST_CHANGES / REQUEST_CHANGES / REQUEST_CHANGES / INCONCLUSIVE / APPROVED | —     |
