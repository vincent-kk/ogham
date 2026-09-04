# Calibration Answer Key — Findings and Gaps

Never copy this file into a scratch repository.

Rows for `run-f` and `run-g` were taken from `structure_validate` and `verification_scan` output over materialized trees, not predicted from reading the rules. The `run-h` defect is fixed to the changed implementation shown in `seeded-bug.md`.

## Expected Findings

| ID | Run | Category | Severity | Path | Rule | Expected result |
| --- | --- | --- | --- | --- | --- | --- |
| FW-1 | run-b | structure | warning | `src/slugify/notes.md` | `zero-peer-file` | confirmed |
| FS-1 | run-c | structure | error | `src/index.ts` | `external-import-boundary` | confirmed |
| FS-2 | run-c | structure | error | `src/slugify/tests/INTENT.md` | `organ-no-intentmd` | confirmed |
| FC-1 | run-d | contract | error | `src/slugify/DETAIL.md` | `contract-entry-mismatch` | confirmed |
| FF-1 | run-f | structure | warning | `src/slugify/notes.md` | `zero-peer-file` | confirmed |
| FH-1 | run-h | bug | error | `src/slugify/slugify.ts` | `DEF-2` | confirmed |

## Expected Gaps

A gap is expected missing evidence, not a defect in the fixture. This is the only expected gap.

| ID | Run | Category | Path | Rule | Affects verdict |
| --- | --- | --- | --- | --- | --- |
| GF-1 | run-f | verification | `src/slugify/tests/slugify.spec.ts` | verification role unresolved | yes |

FF-1 and GF-1 share the owning fractal `src/slugify` but describe different facts. The missing verification evidence keeps `run-f` `INCONCLUSIVE` even though FF-1 is confirmed.

## Guard Rails

- `run-a` and `run-g` have no expected finding and no expected gap.
- `run-b` has only FW-1.
- `run-c` has only FS-1 and FS-2.
- `run-d` has only FC-1.
- `run-f` has FF-1 and GF-1.
- `run-g` produces four out-of-scope rows listed in `out-of-scope-certainty.md`. Three carry the project root as their path and are sourced from `src/tokenize/`; none is a candidate or gap.
- `run-h` has only FH-1. It is category `bug`, severity `error`, and is anchored to the `rules/default.md` empty-boundary check `DEF-2`.
- A `detail-document-contract` error in any run means the base tree was materialized without the `## Acceptance Criteria` sections in `clean-change.md`. That is a materialization defect, not an expected finding; rebuild the base and rerun.
- Category routing follows each answer-key row, and verification cites the corresponding implementation, entry, document placement, or contract line for every confirmation.
