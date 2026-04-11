# filid-review — Reference Index

Reference documentation for `filid-review` is split into focused files.
This index routes readers to the right file based on what they need.

| File                  | Contents                                                                                           |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| `templates.md`        | Review report, fix requests, and PR comment output formats                                         |
| `contracts.md`        | Committee → agent mapping, opinion frontmatter schema, subagent prompt rules, post-completion verification |
| `mcp-map.md`          | Available MCP tools, per-phase usage map, batch partitioning thresholds, checkpoint resume table, debt bias levels |
| `prompt-templates.md` | Literal subagent prompt templates for Phase A / B / C1 / C2                                        |
| `state-machine.md`    | Phase D round judgment rules (quorum, VETO branch, 5-round limit)                                  |
| `phases/phase-*.md`   | Per-phase subagent instructions (A / B / C1 / C2 / D)                                              |

## Cross-Reference Map

- Writing `review-report.md` or `fix-requests.md`? → `templates.md`
- Need the committee list for a complexity tier? → `contracts.md` →
  "Committee → Agent File Mapping"
- Validating a round opinion frontmatter? → `contracts.md` → "Opinion
  Frontmatter Contract"
- Constructing a subagent prompt? → `prompt-templates.md` (literal
  templates) + `contracts.md` → "Subagent Prompt Rules" (meta-rules)
- Checking which MCP tool to call in which phase? → `mcp-map.md` →
  "MCP Tool Usage Map by Phase"
- Deciding whether to partition a large diff into batches? → `mcp-map.md`
  → "Batch Partitioning Thresholds"
- Resuming a partially-completed review? → `mcp-map.md` → "Checkpoint
  Resume Table"
- Interpreting `debt_bias_level` in verification output? → `mcp-map.md`
  → "Debt Bias Injection"
- Phase D round quorum math? → `state-machine.md`
