---
review_schema: 7
verdict: INCONCLUSIVE
branch: calib/f
base_ref: main
source_hash: cf908f44abebdb894b2ac5875ee38edde22adc6f5bccda07590fe6d2a8cb16ce
snapshot_hash: 1cd5186cacf03bdd63df03c8e79be5922d6344dbbbd7f642e4123b0d6eef39c1
files_total: 3
files_reviewed: 3
files_skipped: 0
generated_at: 2026-09-04T20:14:25.496Z
---

# Cross-Review — calib/f

## Scope

| Path | Owner |
| --- | --- |
| src/slugify/notes.md | src/slugify |
| src/slugify/slugify.ts | src/slugify |
| src/slugify/tests/slugify.spec.ts | src/slugify |

## Evidence Status

| Field | Value |
| --- | --- |
| source_hash | cf908f44abebdb894b2ac5875ee38edde22adc6f5bccda07590fe6d2a8cb16ce |
| snapshot_hash | 1cd5186cacf03bdd63df03c8e79be5922d6344dbbbd7f642e4123b0d6eef39c1 |
| evidence_complete | false |
| structure_status | indeterminate |
| verification_status | indeterminate |
| worktree | clean |

## Coverage

| Path | Change | Group | Result | Reason |
| --- | --- | --- | --- | --- |
| src/slugify/notes.md | A | 01 | reviewed |  |
| src/slugify/slugify.ts | M | 01 | reviewed |  |
| src/slugify/tests/slugify.spec.ts | M | 01 | reviewed |  |

## Verification Log

| Candidate | Category | Verdict | Evidence | Reason |
| --- | --- | --- | --- | --- |
| FCA-001 | structure | CONFIRMED | plugins/filid/src/core/rules/ruleEngine/utils/checkZeroPeerFile.ts VR(): allowed peers for a fractal root are INTENT.md, DETAIL.md, entry-point basenames, the eponymous file, and framework-reserved files; src/slugify/notes.md (added by diffs/01/01-notes.md.diff) is none of these, and the emitted message template `Fractal root "${node.name}" contains peer file "${file}" not in any allowed category. Promote it to a sub-fractal directory.` reproduces the candidate's message verbatim for node.name="slugify", file="notes.md". | notes.md sits at the src/slugify fractal root and is not INTENT.md, DETAIL.md, an entry point, the eponymous file, or a framework-reserved file, so the real zero-peer-file rule (ruleId ZERO_PEER_FILE) fires exactly as claimed. |
| FCA-002 | verification | CONFIRMED | plugins/filid/src/adapters/ecmascript/verification/countSemanticCases.ts parseEach()/parseStaticRows(): a case API's `.each(...)` argument is only counted exactly when it is an array literal `[...]` or a backtick template table; `it.each(loadRows())` in src/slugify/tests/slugify.spec.ts (diffs/01/03-slugify.spec.ts.diff) passes the call expression `loadRows()`, which is neither, so parseStaticRows returns `exact: false` and the counter adds the reason string `parameterized case at offset ${token.start} uses a dynamic table`. Running `s.indexOf('it.each')` against the current src/slugify/tests/slugify.spec.ts file yields offset 297, matching the candidate's cited offset exactly. | The rewritten test uses `it.each(loadRows())` with a dynamically returned table instead of an inline array/template literal, which the real spec-document-case-cap counting logic cannot statically enumerate, producing the exact indeterminate reason text and offset (297) cited by the finding. |

## Confirmed Findings

| ID | Severity | Category | Path | Rule | Consequence | Action |
| --- | --- | --- | --- | --- | --- | --- |
| FCA-001 | warning | structure | src/slugify:unknown | zero-peer-file |  |  |
| FCA-002 | warning | verification | src/slugify/tests/slugify.spec.ts:unknown | spec-document-case-cap |  |  |

## Refuted Candidates

none

## Unresolved Evidence

none

## Final Verdict

**INCONCLUSIVE** — Review evidence is incomplete or unresolved.
