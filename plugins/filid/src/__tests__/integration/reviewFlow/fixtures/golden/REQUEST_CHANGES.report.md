---
review_schema: 7
verdict: REQUEST_CHANGES
review_complete: true
branch: feature/review-flow
base_ref: main
source_hash: 35f98f22d490d4ec086c3b2daf01bd7bfde64e71639675ef7b4bf6c0a7df90ab
snapshot_hash: 2b2f4bb467aa1d9be7aa25b6c5a5ad4832c7e7c96ed72351a5578baa0dc41ce7
files_total: 2
files_reviewed: 1
files_skipped: 1
generated_at: <SEALED_AT>
---

# Cross-Review — feature/review-flow

## Scope

| Path | Owner |
| --- | --- |
| src/value.ts | unowned |
| yarn.lock | unowned |

## Evidence Status

| Field | Value |
| --- | --- |
| source_hash | 35f98f22d490d4ec086c3b2daf01bd7bfde64e71639675ef7b4bf6c0a7df90ab |
| snapshot_hash | 2b2f4bb467aa1d9be7aa25b6c5a5ad4832c7e7c96ed72351a5578baa0dc41ce7 |
| evidence_complete | true |
| review_complete | true |
| structure_status | ok |
| verification_status | ok |
| dependencies_certainty | exact |
| verification_certainty | exact |
| structure_status_composition | Aggregate of structure, dependencies, verification and diagnostic uncertainty |
| worktree | clean |

### Incremental Reuse

| Field | Value |
| --- | --- |
| reusedFiles | 0 |
| reviewFiles | 1 |
| reusedGroups | 0 |
| rerunGroups | 0 |
| newGroups | 1 |
| removedGroups | 0 |
| bookkeepingGroups | 0 |
| remainingMaxReviewerHandoffs | 1 |

## Coverage

1 / 1 reviewable files reviewed; 0 pending; 1 excluded; 2 total

### Exclusions by reason

| Reason | Count | Representative paths |
| --- | --- | --- |
| lockfile | 1 | yarn.lock |

| Path | Change | Group | Result | Reason |
| --- | --- | --- | --- | --- |
| src/value.ts | M | 01 | reviewed |  |
| yarn.lock | M |  | skipped | lockfile |

## Verification Log

| Candidate | Category | Verdict | Evidence | Reason |
| --- | --- | --- | --- | --- |
| R01-001 | bug | CONFIRMED | src/value.ts:1 | The changed export decides the claim. |

## Confirmed Findings

| ID | Severity | Category | Path | Rule | Consequence | Action |
| --- | --- | --- | --- | --- | --- | --- |
| R01-001 | error | bug | src/value.ts:1-1 | DEF-1 | Consumers observe the wrong value. | Restore the intended exported value. |

## Refuted Candidates

none

## Unresolved Evidence

none

## Final Verdict

**REQUEST_CHANGES** — Confirmed findings require bounded corrections.
