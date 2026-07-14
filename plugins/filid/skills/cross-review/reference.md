# cross-review — Reference Index

Reference documentation for `cross-review` is split into focused files.

| File                 | Contents                                                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `contracts.md`       | Committee → agent mapping, opinion frontmatter schema, severity gate, verifier verdict ladder, verdict derivation, acceptance claims, subagent prompt rules, config-patch gate |
| `templates.md`       | Review report, fix requests, advisory ledger, and PR comment formats                                                                                                           |
| `phases/evidence.md` | Evidence subagent instructions (MCP measurement stages, output schema, half/batch scopes, merge protocol)                                                                      |
| `calibration/`       | Verdict regression fixtures (clean / low-only / seeded / claim runs; FPR, FNR, severity-inflation, claim scoring)                                                              |

## Cross-Reference Map

- Writing `review-report.md` or `fix-requests.md`? → `templates.md`
- Committee list for a complexity tier? → `contracts.md` →
  "Complexity → Committee Mapping"
- Validating an opinion frontmatter? → `contracts.md` → "Opinion
  Frontmatter Contract"
- Severity gate, consequence requirement, anti-inflation rules? →
  `contracts.md` → "Severity Gate & Finding Discipline"
- Verifier prompts and CONFIRMED/PLAUSIBLE/REFUTED semantics? →
  `contracts.md` → "Verifier Verdict Ladder"
- Deriving the final verdict? → `contracts.md` → "Verdict Derivation"
- Which MCP tool measures what, and when? → `phases/evidence.md`
- Acceptance-claim scoping, aggregation, folding? → `contracts.md` →
  "Acceptance Claims (criteria ledger)"
- Advisory Notes / advisory ledger? → `templates.md`
- Regression-testing the reviewer itself? → `calibration/calibration.md`

## MCP Tools Used

| Tool                                                                                                                                        | Caller         | Purpose                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------- |
| `review_manage` (session actions)                                                                                                           | chairperson    | normalize-branch, check-cache, checkpoint, cleanup, ensure-dir, elect-committee, content-hash, format-pr-comment |
| `fractal_scan`, `structure_validate`, `ast_analyze`, `test_metrics`, `coverage_verify`, `drift_detect`, `debt_manage(list, calculate-bias)` | evidence agent | all technical measurement (`phases/evidence.md`)                                                                 |
| `config_patch_validate`                                                                                                                     | chairperson    | config-patch gate before fix-requests emission (bookkeeping)                                                     |
| `debt_manage(create)`                                                                                                                       | chairperson    | advisory-ledger promotion at count 3 (bookkeeping)                                                               |

All tool names use the full form `mcp__plugin_filid_tools__<tool>`.
