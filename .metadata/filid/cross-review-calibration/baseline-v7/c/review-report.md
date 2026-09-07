---
review_schema: 7
verdict: REQUEST_CHANGES
branch: calib/c
base_ref: main
source_hash: d0011d64309a4f128668891c2e82e34586ba9096996601439286916d3045b2b6
snapshot_hash: a426e391d912325a0343e4638379e97e7f6272440da02c4f11a9eee6fee2fca7
files_total: 4
files_reviewed: 4
files_skipped: 0
generated_at: 2026-09-04T20:07:42.352Z
---

# Cross-Review — calib/c

## Scope

| Path | Owner |
| --- | --- |
| src/index.ts | src |
| src/slugify/slugify.ts | src/slugify |
| src/slugify/tests/INTENT.md | src/slugify/tests |
| src/slugify/tests/slugify.spec.ts | src/slugify/tests |

## Evidence Status

| Field | Value |
| --- | --- |
| source_hash | d0011d64309a4f128668891c2e82e34586ba9096996601439286916d3045b2b6 |
| snapshot_hash | a426e391d912325a0343e4638379e97e7f6272440da02c4f11a9eee6fee2fca7 |
| evidence_complete | true |
| structure_status | violations |
| verification_status | ok |
| worktree | clean |

## Coverage

| Path | Change | Group | Result | Reason |
| --- | --- | --- | --- | --- |
| src/index.ts | M | 01 | reviewed |  |
| src/slugify/slugify.ts | M | 01 | reviewed |  |
| src/slugify/tests/INTENT.md | A | 01 | reviewed |  |
| src/slugify/tests/slugify.spec.ts | M | 01 | reviewed |  |

## Verification Log

| Candidate | Category | Verdict | Evidence | Reason |
| --- | --- | --- | --- | --- |
| FCA-001 | structure | CONFIRMED | src/index.ts:1 imports './slugify/slugify.js' directly; src/slugify/index.ts:1 is slugify's entry point re-exporting slugify from './slugify.js'. Per checkExternalImportBoundary (plugins/filid/src/core/rules/ruleEngine/utils/checkExternalImportBoundary.ts:100-129), sourceNode=src, targetNode=slugify, sameOwner=false, targetIsEntryPoint=false (resolved path is slugify.ts, not index.ts) => externalInternalImport=true, producing the exact violation text. | src/index.ts reaches slugify.ts directly instead of through src/slugify/index.ts, which literally satisfies the externalInternalImport branch that emits 'bypasses the target module boundary'. |
| FCA-002 | contract | CONFIRMED | ls src/slugify/tests shows only INTENT.md and slugify.spec.ts, no DETAIL.md. classifyNode (organClassifier.ts:85) returns 'fractal' for any directory with INTENT.md before the organ-name check, so tests is type=fractal. checkDocumentContract (checkDocumentContract.ts:40-54) fires when node.type==='fractal' and !hasDetailMd and no prior findings, emitting 'is missing its detail contract document'. | tests is classified fractal solely by INTENT.md's presence and has no DETAIL.md on disk, which is exactly the condition checkDocumentContract('detail') checks before emitting a violation. |
| FCA-003 | contract | CONFIRMED | ls src/slugify/tests confirms no index.ts or any entry-point file exists. checkModuleEntryPoint (checkModuleEntryPoint.ts:6-16) fires when node.type is fractal/hybrid and node.entryPoints.length===0, producing the message verbatim: 'Fractal module "tests" does not have an adapter-reported entry point.' | The tests directory contains no file an adapter could report as an entry point, matching the zero-entry-points precondition of checkModuleEntryPoint exactly. |
| FCA-004 | structure | CONFIRMED | organNames.ts:13-20 lists 'tests' in TEST_ORGAN_NAMES (part of KNOWN_ORGAN_DIR_NAMES). checkOrganNoIntentMd (checkOrganNoIntentmd.ts:21-40) fires when node.type==='fractal', node.hasIntentMd, node.name is a known organ name, !node.hasDetailMd, and no module-kind entry point — all four hold for src/slugify/tests (INTENT.md present, DETAIL.md absent, no entry points at all), reproducing the message verbatim. | 'tests' is a built-in organ name that was promoted to fractal by INTENT.md alone with no DETAIL.md and no module entry point, which is the exact silent-promotion condition checkOrganNoIntentMd reports. |
| FCA-005 | structure | CONFIRMED | checkZeroPeerFile (checkZeroPeerFile.ts:19-68) builds an allowed set of INTENT.md, DETAIL.md, entry-point basenames, eponymous file, and framework/config-allowed files. src/slugify/tests has no entry points, no eponymous 'tests.ts', and no framework/config allowances observed; its only non-INTENT.md peer file is slugify.spec.ts, which is not in the allowed set, so it is returned as a disallowed peer with the exact message. | slugify.spec.ts is a peer file in the fractal-classified tests directory that matches none of checkZeroPeerFile's allowed categories, directly reproducing the reported violation. |
| FCA-006 | contract | CONFIRMED | src/slugify/tests/INTENT.md content is only '# tests' plus 'Independent documentation inside a test organ.' — no '## Boundaries' section and no 'Always do' / 'Ask first' / 'Never do' subsections, unlike src/INTENT.md and src/slugify/INTENT.md which both contain all three subsections under '## Boundaries'. | The tests INTENT.md literally lacks the Always do / Ask first / Never do subsections that the sibling INTENT.md files in this same change demonstrate as the expected 3-tier boundary contract shape. |

## Confirmed Findings

| ID | Severity | Category | Path | Rule | Consequence | Action |
| --- | --- | --- | --- | --- | --- | --- |
| FCA-001 | error | structure | src/index.ts:unknown | external-import-boundary |  |  |
| FCA-002 | error | contract | src/slugify/tests:unknown | detail-document-contract |  |  |
| FCA-003 | warning | contract | src/slugify/tests:unknown | module-entry-point |  |  |
| FCA-004 | warning | structure | src/slugify/tests:unknown | organ-no-intentmd |  |  |
| FCA-005 | warning | structure | src/slugify/tests:unknown | zero-peer-file |  |  |
| FCA-006 | warning | contract | src/slugify/tests/INTENT.md:unknown | intent-document-contract |  |  |

## Refuted Candidates

none

## Unresolved Evidence

none

## Final Verdict

**REQUEST_CHANGES** — Confirmed findings require bounded corrections.
