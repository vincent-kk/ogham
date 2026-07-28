# enrich-docs — Tables

Lookup tables for [SKILL.md](./SKILL.md). The detailed evidence and validation
contract is in [reference.md](./reference.md).

## Available MCP Tools

| Tool                                          | Stage      | Purpose                                          | Input                                                       |
| --------------------------------------------- | ---------- | ------------------------------------------------ | ----------------------------------------------------------- |
| `mcp__plugin_filid_tools__fractal_scan`       | Evidence   | Snapshot-backed node paths and document presence | `{ path, detail: "paths", maxDepth? }`                      |
| `mcp__plugin_filid_tools__context_resolve`    | Evidence   | Minimal owner-to-root document references        | `{ path, targetPath }`                                      |
| `mcp__plugin_filid_tools__structure_validate` | Validation | Canonical document and node findings             | `{ path, mode: "project", scopes: ["documents", "nodes"] }` |

All three return the common Filid envelope. A non-`ok` status remains visible in
the report and is never converted into a successful audit.

## Options

| Option             | Type    | Default | Description                                              |
| ------------------ | ------- | ------- | -------------------------------------------------------- |
| `path`             | string  | cwd     | Project subtree to audit                                 |
| `--depth`          | integer | `10`\*  | `max-depth` rule threshold; not a traversal limit        |
| `--min-quality`    | integer | `70`    | RICH/SPARSE threshold                                    |
| `--dry-run`        | flag    | off     | Display the evidence-backed plan without writes          |
| `--auto-approve`   | flag    | off     | Treat invocation as prior approval of the displayed plan |
| `--include-detail` | flag    | off     | Include DETAIL.md contract quality                       |

\* The project's configured `structure.maxDepth` when set, otherwise `10`. The
scan itself always traverses the full tree; this value only decides when a node
counts as a `max-depth` violation.

## Terminal Stage Markers

| Marker                                   | Meaning                  |
| ---------------------------------------- | ------------------------ |
| `Enrich-docs complete: N files enriched` | Approved edits validated |
| `Enrich-docs dry-run complete`           | Plan shown; no writes    |
| `Enrich-docs skipped: all RICH`          | Nothing required editing |
| `Enrich-docs cancelled`                  | Approval was declined    |
