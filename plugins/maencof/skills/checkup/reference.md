# checkup — Reference

Detailed diagnostic items, report format, auto-fix rules, and the lightweight `--quick` mode.

## 8 Diagnostic Items

| #   | Item                                                                                                                    | ID                  | Severity | Auto-fixable                                                                                           |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ------------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| 1   | **Orphan Node**: nodes with 0 inbound and 0 outbound wikilinks (LINK subgraph), triaged by provenance bucket            | orphan-node         | warning  | partially (`/maencof:suggest` for authored docs; archived stubs and raw clippings are expected states) |
| 2   | **Stale Index**                                                                                                         | stale-index         | warning  | yes (`/maencof:build --force --reset-cache`)                                                           |
| 3   | **Broken Link**                                                                                                         | broken-link         | error    | no (manual review required)                                                                            |
| 4   | **Layer Violation**: mismatch between path directory and Frontmatter layer field                                        | layer-mismatch      | error    | partially                                                                                              |
| 5   | **Duplicate Document**: document pairs sharing 3+ identical tags with high title similarity                             | duplicate           | warning  | partially                                                                                              |
| 6   | **Frontmatter Validation**: items failing FrontmatterSchema (Zod) validation                                            | invalid-frontmatter | error    | yes                                                                                                    |
| 7   | **Auto-Insight Health**: insight-config.json/meta-prompt/stats integrity, orphaned auto-insights, session capture limit | auto-insight-health | warning  | partially (config provisioning)                                                                        |
| 8   | **Missing L1 Gist**: Layer 1 documents whose frontmatter lacks a non-empty `gist` field                                 | missing-l1-gist     | warning  | no (propose a draft gist ≤128 chars for user review)                                                   |

## Diagnostic Workflow Detail

### Step 1 — Run Diagnostics

Delegated to the checkup agent:

- `mcp__plugin_maencof_t__kg_status` (`include_orphan_paths: true`) → detect D2 (stale) + D1 orphan buckets (`linkOrphanByLayer` / `linkOrphanArchivedCount` / `linkOrphanPaths`)
- `Glob "**/*.md"` → collect full file list
- `mcp__plugin_maencof_t__read` per file → verify D6 (Frontmatter), D4 (Layer violation), D8 (missing L1 gist)
- `mcp__plugin_maencof_t__kg_navigate` → validate backlink-index.json integrity → detect D3 (broken link)
- `mcp__plugin_maencof_t__kg_suggest_links` on sampled authored orphans → D1 actionability (candidates → `/maencof:suggest`; none → tag first)
- Tag similarity analysis → detect D5 (duplicate)
- Read `.maencof-meta/insight-config.json` + `auto-insight-stats.json` → detect D7 (auto-insight health)

### Step 2 — Report Format

```markdown
## Diagnostic Report — {date}

### Summary

- Errors: N | Warnings: N | Info: N
- Auto-fixable: N

### Detailed Diagnostics

#### Broken Links (error)

- {file}: {link} -> unreachable

#### Frontmatter Errors (error)

- {file}: missing required field 'tags'

#### Orphan Nodes (warning — bucketed by provenance)

- L1 core isolation: {file} — identity document disconnected from the knowledge web
- Authored, actionable: {file} — link candidates found → run /maencof:suggest
- Authored, no candidates: {file} — add tags first, then re-run /maencof:suggest
- Archived stubs: N files (expected — no action)
- Raw clippings ({collector folder}): N files (expected — consider a folder MOC (index.md) if the cluster matters)

### Recommended Actions

1. /maencof:build --force --reset-cache — rebuild stale index
2. N broken links require manual fix
```

### Step 3 — Auto-fix Rules

Execute AutoFixAction after user confirmation:

| Action                                | Tool                                   | Condition                |
| ------------------------------------- | -------------------------------------- | ------------------------ |
| Fill missing Frontmatter fields       | `mcp__plugin_maencof_t__update`        | D6 items                 |
| Rebuild stale index                   | `/maencof:build --force --reset-cache` | D2 items                 |
| Fix layer field based on path         | `mcp__plugin_maencof_t__update`        | D4 items                 |
| Suggest links for orphan nodes        | `/maencof:suggest`                     | D1 authored-bucket items |
| Provision missing auto-insight config | config-provisioner defaults            | D7 items                 |
| Propose draft L1 gist (report-only)   | user edits frontmatter after review    | D8 items                 |

**Layer 1 (01_Core/) exception**: Auto-fix via `mcp__plugin_maencof_t__update` is forbidden for L1 files. Report the issue and guide the user to run `/maencof:setup --step 4` or edit manually.

**No-frontmatter exception**: `mcp__plugin_maencof_t__update` requires the target to already have a frontmatter block. A D6 file whose frontmatter block is entirely missing cannot be auto-fixed via `update` — recreate it with `mcp__plugin_maencof_t__create` or repair the file manually. (Files that have a frontmatter block but invalid/missing fields are still auto-fixable.)

## Error Handling

- **Checkup agent failure**: return partial results, list failed items
- **MCP server connection failure**: guide to check `.mcp.json` configuration
- **Empty vault**: "No documents found. Run `/maencof:setup` first."

---

## --quick Mode

> Behavior and semantics live in SKILL.md § `--quick Mode`. This section owns the report-format templates, action matrix, and kg_status response fields.

### Report Format

#### Healthy (stale < 10%)

```
maencof Index Status
━━━━━━━━━━━━━━━━━━━━━━━━━━
Nodes:         {N}
Edges:         {N}
Last built:    {time ago / YYYY-MM-DD HH:mm}
Stale ratio:   {N}% ({staleCount}) — OK
Freshness:     {freshnessPercent}%
━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: OK
```

#### Caution (stale 10-30%)

```
maencof Index Status
━━━━━━━━━━━━━━━━━━━━━━━━━━
Nodes:         {N}
Edges:         {N}
Last built:    {time ago / YYYY-MM-DD HH:mm}
Stale ratio:   {N}% ({staleCount}) — Caution
Freshness:     {freshnessPercent}%
━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: Caution
Recommended: Run /maencof:build --force --reset-cache.
```

#### Critical (stale > 30% or no index)

```
maencof Index Status
━━━━━━━━━━━━━━━━━━━━━━━━━━
Index: missing / critically stale
━━━━━━━━━━━━━━━━━━━━━━━━━━
Recommended: Run /maencof:build --full or /maencof:checkup
```

### Sub-Layer Distribution

Always include sub-layer distribution from the `mcp__plugin_maencof_t__kg_status` response
(`subLayerDistribution` field) after the status banner:

```
Sub-Layer Distribution:
  L3: relational (N), structural (N), topical (N), unclassified (N)
  L5: buffer (N), boundary (N), unclassified (N)
```

### --verbose Additions

When `--verbose` is specified together with `--quick`, additionally display:

- List of stale node paths (up to 10)
- Number of files modified since last build
- Node distribution by Layer
- **Wikilink (LINK) isolation** — report `linkOrphanCount` / `linkInboundOrphanCount` / `linkOutboundOrphanCount`, plus the provenance split `linkOrphanByLayer` / `linkOrphanArchivedCount`. These surface semantic isolation that the total-degree orphan check hides (folder SIBLING edges make almost every node look "connected"). Read the split by provenance, not as one number: archived stubs (`archived: true`) and bulk-imported raw clippings (L3 raw inbox, collector folders such as `04_Action/geeknews/`) legitimately lack wikilinks — while L1 entries in `linkOrphanByLayer` deserve the opposite emphasis (core identity disconnected from the knowledge web):
  ```
  Wikilink Isolation:
    fully isolated (no in/out LINK): N — by layer {L1: N, ...}, archived stubs N
    unreferenced (no inbound LINK): N
    no outbound LINK: N
  ```
- **Sub-layer consistency check** — detect mismatches between directory path and frontmatter `sub_layer` field:
  ```
  Sub-Layer Consistency Issues:
    - 03_External/relational/doc.md has sub_layer: "topical" (expected: "relational")
    - 05_Context/buffer/old.md has sub_layer: "boundary" (expected: "buffer")
  ```

### Recommended Action Matrix (--quick)

| Status           | Condition     | Recommended Action                          |
| ---------------- | ------------- | ------------------------------------------- |
| OK               | stale < 10%   | none                                        |
| Caution          | stale 10-30%  | `/maencof:build --force --reset-cache`      |
| Critical         | stale > 30%   | `/maencof:build --full`                     |
| No index         | index missing | `/maencof:build`                            |
| Structural issue | —             | `/maencof:checkup` (full 7-check diagnosis) |

### kg_status Response Fields

| Field                     | Type    | Description                                                                                                                                     |
| ------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `nodeCount`               | number  | Total node count                                                                                                                                |
| `edgeCount`               | number  | Total edge count                                                                                                                                |
| `lastBuiltAt`             | string  | Last build timestamp                                                                                                                            |
| `staleNodeCount`          | number  | Stale node count                                                                                                                                |
| `freshnessPercent`        | number  | Index freshness (%)                                                                                                                             |
| `rebuildRecommended`      | boolean | Whether full rebuild is recommended                                                                                                             |
| `subLayerDistribution`    | object  | L3 (relational/structural/topical) and L5 (buffer/boundary) node counts                                                                         |
| `linkOrphanCount`         | number  | Nodes with no inbound and no outbound wikilink (LINK) — semantic isolation that total-degree orphan misses because folder SIBLING edges mask it |
| `linkInboundOrphanCount`  | number  | Nodes never referenced by any wikilink (no inbound LINK)                                                                                        |
| `linkOutboundOrphanCount` | number  | Nodes that link to nothing (no outbound LINK)                                                                                                   |
| `linkOrphanByLayer`       | object  | Orphan counts keyed by layer ('1'–'5') — L1 entries are high-signal; L3/L4 raw clippings are usually expected                                   |
| `linkOrphanArchivedCount` | number  | Orphans that are archived stubs (`archived: true`) — wikilink absence is their normal state                                                     |
| `linkOrphanPaths`         | array   | Sorted orphan paths (capped at 200; `01_Core` sorts first) — only when called with `include_orphan_paths: true`                                 |

### --quick Error Handling

- **kg_status failure**: "MCP server connection failed. Check your `.mcp.json` configuration."
- **No index**: report as unbuilt state and guide to `/maencof:build`
