# cross-review — Reference Index

| File                        | Contents                                                                         |
| --------------------------- | -------------------------------------------------------------------------------- |
| `contracts.md`              | Scope, state lifecycle, evidence identity, opinion schema, arbitration, verdicts |
| `templates.md`              | Canonical session, evidence, opinion, report, and fix-request layouts            |
| `phases/evidence.md`        | Exact snapshot-backed evidence collection                                        |
| `reviewers/contract.md`     | Contract perspective instructions                                                |
| `reviewers/structure.md`    | Structure perspective instructions                                               |
| `reviewers/verification.md` | Verification perspective instructions                                            |
| `reviewers/adversarial.md`  | Candidate arbitration instructions                                               |
| `calibration/`              | Clean, warning-only, seeded, and contract-change regression fixtures             |

## Cross-Reference Map

- Starting or resuming a run → `contracts.md` → Review-State Lifecycle
- Collecting tool evidence → `phases/evidence.md`
- Writing an opinion → `contracts.md` → Opinion Contract
- Resolving disagreement → `contracts.md` → Arbitration Contract
- Deriving a verdict → `contracts.md` → Verdict Derivation
- Writing artifacts → `templates.md`
- Regression-checking the reviewer → `calibration/calibration.md`

## Filid Tools

| Tool                 | Purpose                                                                             |
| -------------------- | ----------------------------------------------------------------------------------- |
| `review_state`       | Prepare, checkpoint, seal, or explicitly clean the branch review state              |
| `fractal_scan`       | Produce snapshot identity, node paths, document state, and entry evidence           |
| `structure_validate` | Evaluate documents, nodes, entry points, boundaries, DAG, and verification scope    |
| `verification_scan`  | Evaluate spec-document and test-record evidence with role-specific caps             |
| `context_resolve`    | Optionally resolve the owner-to-root document chain for an ambiguous changed target |

Use the full MCP form `mcp__plugin_filid_tools__<tool>`.
