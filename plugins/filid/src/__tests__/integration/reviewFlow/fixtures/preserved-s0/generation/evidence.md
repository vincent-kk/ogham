---
review_schema: 7
source_hash: 75d87434d91a74ebf40dd1439340f966b44f9f47f742f23bf76b63c348bf1610
snapshot_hash: 6c97f95843d9c5e8a899c2b4aa57e9cf9776eed38481326299dada236f877c2f
evidence_complete: true
structure_status: violations
verification_status: ok
dependencies_certainty: exact
verification_certainty: exact
worktree: clean
created_at: 2026-09-19T13:35:02.766Z
---

## Changed Scope

| Path | Change | Role | Owner | Churn |
| --- | --- | --- | --- | --- |
| `src/alpha/index.ts` | M | source | `src/alpha` | +1/-1 |
| `src/beta/index.ts` | M | source | `src/beta` | +1/-1 |

## Candidates

| ID | Category | Severity | Path | Rule | Message |
| --- | --- | --- | --- | --- | --- |
| FCA-001 | contract | error | `src/alpha` | `intent-document-contract` | INTENT.md is required for fractal node <PROJECT_ROOT>/src/alpha. |
| FCA-002 | contract | error | `src/beta` | `intent-document-contract` | INTENT.md is required for fractal node <PROJECT_ROOT>/src/beta. |

## Informational

none

## Out-of-scope Observations

| Source | Rule | Severity | Count |
| --- | --- | --- | --- |
| structure | `detail-document-contract` | error | 6 |

## Diagnostics

none
