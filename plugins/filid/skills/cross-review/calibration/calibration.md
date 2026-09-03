# Filid Cross-Review Calibration

These fixtures regression-test changed-file scope, category routing, independent verification, coverage accounting, and verdict derivation. Reviewers and verifiers must never read this directory during a calibration run.

Each run uses the same pipeline: one reviewer examines each assigned file group and emits candidates, then a separate verifier independently decides every candidate. Score only sealed reports.

## Fixtures

| Run | Fixture | Expected verdict | Purpose |
| --- | --- | --- | --- |
| `run-a` | `clean-change.md` | `APPROVED` | Sound contract, structure, verification, and implementation change |
| `run-b` | `low-only-change.md` | `REQUEST_CHANGES` | One canonical warning remains actionable |
| `run-c` | `seeded-change.md` | `REQUEST_CHANGES` | Seeded organ and external-boundary errors |
| `run-d` | `contract-change.md` | `REQUEST_CHANGES` | Public entry and DETAIL API disagree |
| `run-f` | `genuine-gap.md` | `INCONCLUSIVE` | Missing changed-file evidence suspends the verdict |
| `run-g` | `out-of-scope-certainty.md` | `APPROVED` | Out-of-scope certainty never reaches the verdict |
| `run-h` | `seeded-bug.md` | `REQUEST_CHANGES` | One empty-input boundary bug is independently confirmed |

`seeded-violations.md` is the answer key for runs b, c, d, f, g, and h.

## Materialization

For each run, create a separate scratch repository:

1. Create `/tmp/filid-calibration/<pass>/<run>/`.
2. Initialize `main`, materialize the base tree from `clean-change.md`, and commit it.
3. Confirm `structure_validate` over the base commit reports zero violations. A non-zero count means the tree was materialized incorrectly; correct it before branching because such a row would corrupt the run.
4. Create branch `calib/<run>`, apply only that run's changed files, and commit.
5. Start a fresh session at the scratch root.
6. Invoke the cross-review skill with `main` as its base ref.

`run-g` alters step 2: its fixture adds files to `main` before the base commit, and its branch carries only the clean change. Read `out-of-scope-certainty.md` before materializing it. Its step 3 expects the four enumerated out-of-scope rows rather than zero.

Do not copy calibration documents into the scratch repository. The session that materializes a fixture must not review it because it already knows the answer. Keep the working tree clean so review-state and snapshot evidence describe the same committed content.

## Scoring

- **False positive**: a verifier returns `CONFIRMED` for a candidate that has no matching answer-key item.
- **False negative**: an answer-key finding is absent from the candidate set or its verifier returns `REFUTED`.
- **Unjustified inconclusive**: a judgeable run ends `INCONCLUSIVE` without an actual missing evidence source. An expected finding left `INDETERMINATE` without a concrete reason also counts here.
- **Suppressed gap**: `run-f` ends with any verdict other than `INCONCLUSIVE`.
- **Coverage miss**: any changed checklist entry is not closed as `reviewed` or `skipped` with a required reason.

A correctly refuted candidate that is absent from the answer key is not a false positive. Every expected finding must be confirmed unless the run is intentionally unjudgeable, and every verification decision must cite the code or canonical evidence that supports it.

Expected counts per complete pass: false positives `0`, false negatives `0`, unjustified inconclusive results `0`, suppressed gaps `0`, coverage misses `0`.

## Regression Ledger

| Date | Runner | FP | FN | Unjustified Inconclusive | Suppressed Gaps | Coverage Misses | Verdicts a/b/c/d/f/g/h | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| <ISO-8601> | <model or session> | 0 | 0 | 0 | 0 | 0 | APPROVED / REQUEST_CHANGES / REQUEST_CHANGES / REQUEST_CHANGES / INCONCLUSIVE / APPROVED / REQUEST_CHANGES | — |
