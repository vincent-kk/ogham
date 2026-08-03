# Calibration Answer Key — FCA Findings

Never copy this file into a scratch repository.

Rows for `run-e`, `run-f`, and `run-g` were taken from `structure_validate` and `verification_scan` output over materialized trees, not predicted from reading the rules. Runs a through d predate that check.

## Expected Findings

| ID   | Run   | Perspective | Severity | Path                          | Rule                       | Expected result |
| ---- | ----- | ----------- | -------- | ----------------------------- | -------------------------- | --------------- |
| FW-1 | run-b | structure   | warning  | `src/slugify/notes.md`        | `zero-peer-file`           | confirmed       |
| FS-1 | run-c | structure   | error    | `src/index.ts`                | `external-import-boundary` | confirmed       |
| FS-2 | run-c | structure   | error    | `src/slugify/tests/INTENT.md` | `organ-no-intentmd`        | confirmed       |
| FC-1 | run-d | contract    | error    | `src/slugify/DETAIL.md`       | `contract-entry-mismatch`  | confirmed       |
| FE-1 | run-e | structure   | warning  | `src/slugify/index.ts`        | `entry-point-surface`      | confirmed       |
| FF-1 | run-f | structure   | warning  | `src/slugify/notes.md`        | `zero-peer-file`           | confirmed       |

## Expected Gaps

A gap is expected evidence, not a defect in the fixture. These are the only ones.

| ID   | Run   | Perspective  | Path                                | Rule                         | Covered | Affects verdict |
| ---- | ----- | ------------ | ----------------------------------- | ---------------------------- | ------- | --------------- |
| GF-1 | run-f | verification | `src/slugify/tests/slugify.spec.ts` | verification role unresolved | no      | yes             |

FF-1 and GF-1 share the owning fractal `src/slugify` and differ in rule, so FF-1 does not cover GF-1. That is the whole point of `run-f`.

## Guard Rails

- `run-a` and `run-g` have no expected finding and no expected gap.
- `run-b` has only FW-1.
- `run-c` has only FS-1 and FS-2.
- `run-d` has only FC-1.
- `run-e` has only FE-1, and no gap survives to the verdict. A gap recorded alongside FE-1 on `src/slugify/index.ts` with rule `entry-point-surface` is covered and verdict-neutral; any other gap is a fixture or reviewer defect.
- `run-f` has FF-1 and GF-1.
- `run-g` produces four out-of-scope rows, listed in `out-of-scope-certainty.md`. Three carry the project root as their path and are sourced from `src/tokenize/`; none is a candidate and none is a gap.
- A `detail-document-contract` error in any run means the base tree was materialized without the `## Acceptance Criteria` sections `clean-change.md` carries. That is a materialization defect, not a finding — rebuild the base and rerun.
- Perspective routing is required because each fixture exercises a distinct FCA evidence owner.
- Arbitration must cite the corresponding entry, document placement, or contract line for every confirmation.
