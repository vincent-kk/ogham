# cross-review — Public Contract Specification

## Requirements

- The pipeline is source/state and change context → scope, layered rules, and snapshot evidence → changed-file review groups → independent candidate verification → report and seal → pull-request delivery.
- `review_state` owns branch keying, committed source identity, resume, cache, seal, and explicit cleanup. Skill text never derives or rewrites its paths, and v5 resumes or returns only artifacts carrying `review_schema: 5`.
- Evidence uses only `fractal_scan`, project-mode `structure_validate`, and `verification_scan`; optional `context_resolve` may clarify an affected contract owner.
- The three evidence snapshot hashes match before review begins.
- Scope contains every committed changed `(path, status)` entry and the owning fractal needed to interpret it. Existing concerns outside that scope do not affect the verdict.
- User instructions, applicable repository rules, and built-in rules are layered for each reviewable file in that precedence order. Current user requirements receive stable `USR-NNN` IDs and the same host-authoritative catalog is supplied to reviewers and verifiers.
- The fixed roles are reviewer and verifier. Each review group has one reviewer, and every candidate finding is independently decided by a verifier.
- Every checklist entry is closed as `reviewed` or `skipped` with a concrete reason where required. A normal in-scope evidence gap keeps the inspected file `reviewed` but produces `INCONCLUSIVE`; only the mechanical artifact after two reviewer failures records `unavailable` while the canonical checklist remains `pending`.
- Changed-scope FCA evidence rows become candidates alongside reviewer findings. Candidate identity is normalized `path + rule`; duplicate identities, severities, fields, and evidence are selected by the deterministic rules in `contracts.md`, and every deduplicated candidate receives exactly one verification decision.
- A verifier cannot create findings. Newly noticed concerns are recorded as verdict-neutral observations.
- `evidence_complete: false` in either canonical evidence file produces `INCONCLUSIVE`. A `warning` with an `INDETERMINATE` decision is verdict-neutral and can coexist with `APPROVED` only when no candidate is `CONFIRMED` and all other candidates are `REFUTED`.
- Cross-review is read-only with respect to project source. It writes only branch-scoped review artifacts managed by `review_state`, except that a complete diff may be captured in host scratch as a transient file outside `PROJECT_ROOT`; that file is bounded to the assigned paths and is never a canonical artifact.
- A terminal verdict is legal only after `review-report.md` exists and `review_state(action: "seal")` succeeds.
- The sealed verdict is delivered as a pull-request comment when the branch has a pull request and is not delivered when it has none. The comment keeps its verdict table outside collapsible sections, remains within the host size limit, and replaces this skill's prior comment instead of accumulating. Delivery failure never alters the verdict.
- Re-run calibration after changes to finding scope, coverage accounting, candidate promotion, verification decisions, or verdict derivation.

## API Contracts

### Review report frontmatter

| Field | Required value |
| --- | --- |
| `review_schema` | literal `5` |
| `verdict` | `APPROVED`, `REQUEST_CHANGES`, or `INCONCLUSIVE` |
| `branch` | reviewed branch name |
| `base_ref` | resolved comparison base |
| `source_hash` | prepared review-state source hash |
| `snapshot_hash` | shared evidence snapshot hash, or `unavailable` |
| `files_total` | integer count of checklist entries |
| `files_reviewed` | integer count closed as `reviewed` |
| `files_skipped` | integer count closed as `skipped` |
| `generated_at` | ISO-8601 timestamp |

### Required artifacts

`session.md`, `verification.md`, `structure-check.md`, `opinions/review-*.md`, `opinions/verify-*.md`, and `review-report.md` are canonical. At least one review artifact exists for every review group, and at least one verification artifact exists even when the candidate set is empty. `fix-requests.md` exists only for `REQUEST_CHANGES`.

The separate verifier re-verification mode returns one decision directly to `revalidate` and does not write a normal `opinions/verify-NN.md` artifact.

Review, candidate, verification, finding, and verdict schemas are defined in `contracts.md`. Output layouts are defined in `templates.md`.
