# filid-enrich-docs — Tables

Consolidated lookup tables for the INTENT.md enrichment skill. Load this file
when you need argument defaults, MCP tool signatures, agent roles, or the
comparison against `filid-update`. For the workflow itself see
[SKILL.md](./SKILL.md); for detailed per-stage implementation see
[reference.md](./reference.md).

## Difference from filid-update

Both skills touch INTENT.md, but they occupy different triggers and detection
models. Use this table to pick the right one.

| Skill                | Trigger                | Detection                 | Incremental gate         | Invocation                       |
| -------------------- | ---------------------- | ------------------------- | ------------------------ | -------------------------------- |
| `filid-update`       | Branch git diff        | Rule violations           | Hash-based (mcp_t_cache_manage) | Internal (`user_invocable: false`) |
| `filid-enrich-docs`  | Target directory path  | Quality smell (heuristic) | None (quality re-eval)   | User-facing (`user_invocable: true`) |

Practical guidance:

- Pick `filid-update` when you just edited code and need docs/tests to catch up
  on the diff.
- Pick `filid-enrich-docs` when the INTENT.md content itself is thin or
  boilerplate-heavy, regardless of recent edits.

## Available MCP Tools

Only tools directly called by this skill are listed. `context-manager` owns
its own reads via the Read/Glob tools — they are not documented here.

| Tool                 | Stage | Purpose                                          | Signature summary                           |
| -------------------- | ----- | ------------------------------------------------ | ------------------------------------------- |
| `mcp_t_fractal_scan`       | 2     | Resolve directory classification (fractal/organ) | `{ path }` → `ScanReport`                   |
| `mcp_t_doc_compress`       | 7     | 50-line limit enforcement                        | `{ mode, filePath, content }` → `{ needsCompression, suggestedContent? }` |
| `mcp_t_structure_validate` | 7     | 3-tier boundary section verification             | `{ path }` → `{ passed, violations[] }`     |

Full tool signatures and return-type schemas live in
[reference.md Sections 2 and 7](./reference.md#section-2--discovery).

## Agents

| Agent             | Capability              | Role in this skill                                        |
| ----------------- | ----------------------- | --------------------------------------------------------- |
| `context-manager` | Write (INTENT/DETAIL)  | Stage 6 — rewrites flagged axes using real source context |

No other agent is used. `context-manager` is the only write-capable agent the
skill invokes, and it never runs without an upstream plan from Stage 4.

## Options

| Option              | Type    | Default   | Description                                          |
| ------------------- | ------- | --------- | ---------------------------------------------------- |
| `path`              | string  | cwd       | Target directory root                                |
| `--depth`           | integer | unlimited | Max child-directory depth to audit                   |
| `--min-quality`     | integer | `70`      | Score threshold separating RICH from SPARSE         |
| `--skip-rich`       | flag    | on        | Exclude RICH files from the plan (default behavior) |
| `--dry-run`         | flag    | off       | Emit plan and exit without writing                   |
| `--auto-approve`    | flag    | off       | Skip Stage 5 approval gate                           |
| `--include-detail`  | flag    | off       | Also audit and enrich DETAIL.md                      |

Options are LLM-interpreted hints, not strict CLI flags. Natural language
works equally well — e.g. "RICH은 건너뛰고 core만" instead of
`--skip-rich packages/filid/src/core`.

### Quality threshold guidance

- `--min-quality 60` — relaxed, enriches only the clearly empty/boilerplate files
- `--min-quality 70` (default) — balanced, catches sparse sections
- `--min-quality 80` — strict, treats moderately populated INTENT.md as SPARSE
- `--min-quality 90` — nearly every file becomes SPARSE; use only for a deep cleanup pass

### Depth guidance

Depth restricts how many nested fractal boundaries below `path` are in scope:

- `--depth 1` — audit only the immediate directory
- `--depth 3` — covers most single-package audits
- unlimited (default) — recurses until no fractal children remain

## Terminal Stage Markers

Emit exactly one of the following strings in the final report so the
Tier-2b anti-yield contract can detect completion:

| Marker                                    | Meaning                                    |
| ----------------------------------------- | ------------------------------------------ |
| `Enrich-docs complete: N files enriched` | Normal success with one or more rewrites  |
| `Enrich-docs dry-run complete`           | `--dry-run` exit without writes            |
| `Enrich-docs skipped: all RICH`          | Nothing above the min-quality threshold   |
| `Enrich-docs cancelled`                  | User chose `cancel` at the approval gate  |

Register these markers in `.omc/research/terminal-markers.json` per the
Tier-2b anti-yield contract.
