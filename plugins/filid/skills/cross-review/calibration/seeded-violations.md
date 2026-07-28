# Calibration Answer Key — FCA Findings

Never copy this file into a scratch repository.

## Expected Findings

| ID   | Run   | Perspective | Severity | Path                          | Rule                       | Expected result |
| ---- | ----- | ----------- | -------- | ----------------------------- | -------------------------- | --------------- |
| FW-1 | run-b | structure   | warning  | `src/slugify/notes.md`        | `zero-peer-file`           | confirmed       |
| FS-1 | run-c | structure   | error    | `src/index.ts`                | `external-import-boundary` | confirmed       |
| FS-2 | run-c | structure   | error    | `src/slugify/tests/INTENT.md` | `organ-no-intentmd`        | confirmed       |
| FC-1 | run-d | contract    | error    | `src/slugify/DETAIL.md`       | `contract-entry-mismatch`  | confirmed       |

## Guard Rails

- `run-a` has no expected finding.
- `run-b` has only FW-1.
- `run-c` has only FS-1 and FS-2.
- `run-d` has only FC-1.
- Perspective routing is required because each fixture exercises a distinct FCA evidence owner.
- Arbitration must cite the corresponding entry, document placement, or contract line for every confirmation.
