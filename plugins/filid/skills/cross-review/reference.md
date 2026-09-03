# cross-review — Reference Index

| File | Contents |
| --- | --- |
| `specification.md` | Public run requirements and review-report frontmatter |
| `contracts.md` | Scope, roles, state lifecycle, evidence identity, schemas, candidate promotion, and verdicts |
| `templates.md` | Canonical session, report, fix-request, pull-request comment, and terminal layouts |
| `phases/scope.md` | Changed-file exclusions, rule resolution, grouping, risk trigger, and coverage checklist |
| `phases/evidence.md` | Exact snapshot-backed FCA evidence collection |
| `reviewers/reviewer.md` | File-group review instructions and Review Contract output |
| `reviewers/verifier.md` | Candidate reproduction and Verification Contract output |
| `rules/default.md` | Correctness, security, performance, maintainability, and manifest checks |
| `rules/tests.md` | Changed-behavior test validity checks |
| `rules/documents.md` | Contract currency, cross-reference, link, and command-example checks |
| `rules/fca.md` | FCA contract, structure, and verification checks |
| `calibration/` | Clean, warning-only, seeded, contract-change, gap, and general-defect regression fixtures |

## Task-to-File Map

- Confirming the run's public guarantees → `specification.md` → Requirements
- Starting, resuming, sealing, or cleaning state → `contracts.md` → Review-State Lifecycle
- Capturing changed entries, resolving rules, and grouping files → `phases/scope.md`
- Collecting tool evidence and checking snapshot identity → `phases/evidence.md`
- Reviewing one changed-file group → `reviewers/reviewer.md` plus its resolved files under `rules/`
- Writing a review artifact → `contracts.md` → Review Contract
- Promoting and deduplicating candidates → `contracts.md` → Candidate Promotion
- Verifying a candidate group → `reviewers/verifier.md`
- Writing a verification artifact → `contracts.md` → Verification Contract
- Deriving a verdict → `contracts.md` → Verdict Derivation
- Writing canonical output or delivering the pull-request comment → `templates.md`
- Regression-checking the workflow → `calibration/calibration.md`

## Filid Tools

| Tool | Purpose |
| --- | --- |
| `review_state` | Prepare, checkpoint, seal, or explicitly clean branch review state |
| `fractal_scan` | Produce snapshot identity, node paths, document state, and entry evidence |
| `structure_validate` | Evaluate documents, nodes, entry points, boundaries, DAG, and verification scope |
| `verification_scan` | Evaluate spec-document and test-record evidence with role-specific caps |
| `context_resolve` | Optionally resolve the owner-to-root document chain for an ambiguous changed target |

Use the full MCP form `mcp__plugin_filid_tools__<tool>`.
