# Calibration Answer Key — Findings and Gaps

Never copy this file into a scratch repository.

Rows for `run-f` and `run-g` were taken from `structure_validate` and `verification_scan` output over materialized trees, not predicted from reading the rules. The `run-h` defect is fixed to the changed implementation shown in `seeded-bug.md`.

## Expected Findings

| ID | Run | Category | Severity | Path | Rule | Expected result |
| --- | --- | --- | --- | --- | --- | --- |
| FW-1 | run-b | structure | warning | `src/slugify/notes.md` | `zero-peer-file` | confirmed |
| FS-1 | run-c | structure | error | `src/index.ts` | `external-import-boundary` | confirmed |
| FS-2 | run-c | structure | warning | `src/slugify/tests/INTENT.md` | `organ-no-intentmd` | confirmed |
| FS-3 | run-c | contract | error | `src/slugify/tests` | `detail-document-contract` | confirmed or explicitly tied to FS-2 |
| FS-4 | run-c | contract | warning | `src/slugify/tests` | `module-entry-point` | confirmed or explicitly tied to FS-2 |
| FS-5 | run-c | structure | warning | `src/slugify/tests` | `zero-peer-file` | confirmed or explicitly tied to FS-2 |
| FS-6 | run-c | contract | warning | `src/slugify/tests/INTENT.md` | `intent-document-contract` | confirmed or explicitly tied to FS-2 |
| FC-1 | run-d | contract | error | `src/slugify/DETAIL.md` | `contract-entry-mismatch` | confirmed |
| FF-1 | run-f | structure | warning | `src/slugify/notes.md` | `zero-peer-file` | confirmed |
| FH-1 | run-h | bug | error | `src/slugify/slugify.ts` | `DEF-2` | confirmed |

FS-1 and FS-2 are the only seeded rule violations in `run-c`. FS-3 through FS-6 are permitted derived rows from the FS-2 edit because `.claude/rules/filid_fractal-boundaries.md` §1 classifies `tests/` as a fractal when `INTENT.md` is present before consulting the known organ-name list.

## Expected Gaps

A gap is expected missing evidence, not a defect in the fixture. This is the only expected gap.

| ID | Run | Category | Path | Rule | Affects verdict |
| --- | --- | --- | --- | --- | --- |
| GF-1 | run-f | verification | `src/slugify/tests/slugify.spec.ts` | verification role unresolved | yes |

FF-1 and GF-1 share the owning fractal `src/slugify` but describe different facts. The missing verification evidence keeps `run-f` `INCONCLUSIVE` even though FF-1 is confirmed.

## Guard Rails

- `run-a` and `run-g` have no expected finding and no expected gap.
- `run-b` has only FW-1.
- `run-c` has exactly FS-1 through FS-6 as candidates. The two seeded rows must be confirmed; each of the four derived rows must be confirmed or explicitly tied to FS-2. No finding outside those six is permitted.
- `run-d` has only FC-1.
- `run-f` has FF-1 and GF-1.
- `run-g` produces five out-of-scope rows listed in `out-of-scope-certainty.md`: four from `structure_validate` and the duplicate tokenize test row from `verification_scan`. Three carry the project root as their path; none is a candidate or gap.
- `run-h` has only FH-1. It is category `bug`, severity `error`, and is anchored to the `rules/default.md` empty-boundary check `DEF-2`.
- A `detail-document-contract` error at `src/slugify` or `src/slugify/DETAIL.md` means the base tree was materialized without the `## Acceptance Criteria` sections in `clean-change.md`. That is a materialization defect, not an expected finding; rebuild the base and rerun. The `run-c` error at `src/slugify/tests` is instead expected FS-3, derived from the `INTENT.md` promotion.
- Category routing follows each answer-key row, and verification cites the corresponding implementation, entry, document placement, or contract line for every confirmation.
