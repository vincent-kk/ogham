# cross-review — Public Contract Specification

## Requirements

- The sequence is Scope/State → Snapshot Evidence → three parallel FCA perspectives → adversarial arbitration → report and seal → pull-request delivery.
- `review_state` owns branch keying, committed source identity, resume, cache, seal, and explicit cleanup. Skill text never derives or rewrites its paths.
- Evidence uses only `fractal_scan`, project-mode `structure_validate`, and `verification_scan`; optional `context_resolve` may clarify an affected contract owner.
- The three tool snapshot hashes must match before review begins.
- Review scope is limited to changed files and their owning fractals. Evidence originating outside that scope is an out-of-scope observation: it changes neither a perspective state nor the verdict.
- The independent perspectives are exactly contract, structure, and verification. Reviewer selection is fixed and has no solo path.
- Adapter-measured opacity is a finding; only evidence the adapters could not obtain is a gap. The same `path + rule` is never recorded in both channels.
- Every candidate is arbitrated. Only confirmed FCA findings can produce `REQUEST_CHANGES`. Unresolved required evidence produces `INCONCLUSIVE`, except a perspective gap already covered by a confirmed finding on the same owning fractal and rule.
- Cross-review is read-only with respect to project source. It writes only branch-scoped review artifacts managed by `review_state`.
- A terminal verdict is legal only after `review-report.md` exists and `review_state(action: "seal")` succeeds.
- The sealed verdict is delivered as a pull-request comment when the branch has a pull request, and is not delivered when it has none. The comment carries a verdict table outside its collapsible sections, stays within the host's comment size limit, and replaces this skill's previous comment rather than accumulating. A comment that cannot be posted never alters the verdict.
- Calibration fixtures contain FCA findings only and are rerun after changes to finding scope, arbitration, or verdict derivation.

## API Contracts

### Review report frontmatter

| Field           | Required value                                   |
| --------------- | ------------------------------------------------ |
| `verdict`       | `APPROVED`, `REQUEST_CHANGES`, or `INCONCLUSIVE` |
| `branch`        | reviewed branch name                             |
| `base_ref`      | resolved comparison base                         |
| `source_hash`   | prepared review-state source hash                |
| `snapshot_hash` | shared evidence snapshot hash, or `unavailable`  |
| `perspectives`  | `[contract, structure, verification]`            |
| `generated_at`  | ISO-8601 timestamp                               |

### Required artifacts

`session.md`, `verification.md`, `structure-check.md`, `opinions/contract.md`, `opinions/structure.md`, `opinions/verification.md`, `opinions/adversarial.md`, and `review-report.md` are canonical. `fix-requests.md` exists only for `REQUEST_CHANGES`.

Opinion, arbitration, finding, and verdict schemas are defined in `contracts.md`. Output layouts are defined in `templates.md`.
