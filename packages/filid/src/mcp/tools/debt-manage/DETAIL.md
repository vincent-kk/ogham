# debt-manage — DETAIL

## Requirements

- `create`: Persist a new debt item as markdown under `<projectRoot>/.filid/debt/<id>.md`.
- `list`: Read every `*.md` in the debt dir; optionally filter by `fractalPath`; return items + total weight.
- `filid-resolve`: Delete the debt file identified by `debtId`. **MUST reject any `debtId` whose resolved absolute path escapes `<projectRoot>/.filid/debt/`** (path traversal containment).
- `calculate-bias`: Compute per-debt bias based on changed fractal paths and current commit SHA; idempotent per `last_review_commit`.

## API Contracts

- Input: `DebtManageInput` with `action`, `projectRoot`, and action-specific fields (`debtItem`, `debtId`, `fractalPath`, `debts`, `changedFractalPaths`, `currentCommitSha`).
- `filid-resolve` guard: before `unlink`, the handler MUST call `assertUnder(debtDir, filePath)` (`src/mcp/tools/utils/fs-guard.ts`). Traversal throws and propagates — no silent `{ deleted: false }`.
- Weight cap: individual debt weight MUST NOT exceed `DEBT_WEIGHT_CAP`.
- All file writes occur strictly under `<projectRoot>/.filid/debt/`.

## Last Updated

- 2026-04-05 — Added path traversal containment requirement for `filid-resolve` action. Introduced shared `assertUnder` helper dependency.
