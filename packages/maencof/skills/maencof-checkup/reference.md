# maencof-checkup — Reference

Detailed diagnostic items, report format, auto-fix rules, and the lightweight `--quick` mode.

## 6 Diagnostic Items

| # | Item | ID | Severity | Auto-fixable |
|---|------|----|----------|-------------|
| 1 | **Orphan Node**: nodes with 0 inbound and 0 outbound links | orphan-node | warning | partially (`/maencof:maencof-suggest` to discover and add links) |
| 2 | **Stale Index** | stale-index | warning | yes (`/maencof:maencof-build --force --reset-cache`) |
| 3 | **Broken Link** | broken-link | error | no (manual review required) |
| 4 | **Layer Violation**: mismatch between path directory and Frontmatter layer field | layer-mismatch | error | partially |
| 5 | **Duplicate Document**: document pairs sharing 3+ identical tags with high title similarity | duplicate | warning | partially |
| 6 | **Frontmatter Validation**: items failing FrontmatterSchema (Zod) validation | invalid-frontmatter | error | yes |

## Diagnostic Workflow Detail

### Step 1 — Run Diagnostics

Delegated to the checkup agent:

- `mcp_t_kg_status` → detect D1 (orphan), D2 (stale)
- `Glob "**/*.md"` → collect full file list
- `mcp_t_read` per file → verify D6 (Frontmatter), D4 (Layer violation)
- `mcp_t_kg_navigate` → validate backlink-index.json integrity → detect D3 (broken link)
- Tag similarity analysis → detect D5 (duplicate)

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

#### Orphan Nodes (warning)
- {file}: no inbound/outbound links

### Recommended Actions
1. /maencof:maencof-build --force --reset-cache — rebuild stale index
2. N broken links require manual fix
```

### Step 3 — Auto-fix Rules

Execute AutoFixAction after user confirmation:

| Action | Tool | Condition |
|--------|------|-----------|
| Fill missing Frontmatter fields | `mcp_t_update` | D6 items |
| Rebuild stale index | `/maencof:maencof-build --force --reset-cache` | D2 items |
| Fix layer field based on path | `mcp_t_update` | D4 items |
| Suggest links for orphan nodes | `/maencof:maencof-suggest` | D1 items |

**Layer 1 (01_Core/) exception**: Auto-fix via `mcp_t_update` is forbidden for L1 files. Report the issue and guide the user to run `/maencof:maencof-setup --step 4` or edit manually.

## Error Handling

- **Checkup agent failure**: return partial results, list failed items
- **MCP server connection failure**: guide to check `.mcp.json` configuration
- **Empty vault**: "No documents found. Run `/maencof:maencof-setup` first."

---

## --quick Mode

Short-circuits to `mcp_t_kg_status` only. No file-level scan, no auto-fix, no agent delegation.
Absorbs the former `maencof-diagnose` skill. Intended as a pre-flight status check
before search/exploration or a simple pre-check before running the full `checkup`.

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
Recommended: Run /maencof:maencof-build --force --reset-cache.
```

#### Critical (stale > 30% or no index)

```
maencof Index Status
━━━━━━━━━━━━━━━━━━━━━━━━━━
Index: missing / critically stale
━━━━━━━━━━━━━━━━━━━━━━━━━━
Recommended: Run /maencof:maencof-build --full or /maencof:maencof-checkup
```

### Sub-Layer Distribution

Always include sub-layer distribution from the `mcp_t_kg_status` response
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
- **Sub-layer consistency check** — detect mismatches between directory path and frontmatter `sub_layer` field:
  ```
  Sub-Layer Consistency Issues:
    - 03_External/relational/doc.md has sub_layer: "topical" (expected: "relational")
    - 05_Context/buffer/old.md has sub_layer: "boundary" (expected: "buffer")
  ```

### Recommended Action Matrix (--quick)

| Status | Condition | Recommended Action |
|--------|-----------|-------------------|
| OK | stale < 10% | none |
| Caution | stale 10-30% | `/maencof:maencof-build --force --reset-cache` |
| Critical | stale > 30% | `/maencof:maencof-build --full` |
| No index | index missing | `/maencof:maencof-build` |
| Structural issue | — | `/maencof:maencof-checkup` (full 6-check diagnosis) |

### kg_status Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `nodeCount` | number | Total node count |
| `edgeCount` | number | Total edge count |
| `lastBuiltAt` | string | Last build timestamp |
| `staleNodeCount` | number | Stale node count |
| `freshnessPercent` | number | Index freshness (%) |
| `rebuildRecommended` | boolean | Whether full rebuild is recommended |
| `subLayerDistribution` | object | L3 (relational/structural/topical) and L5 (buffer/boundary) node counts |

### --quick Error Handling

- **kg_status failure**: "MCP server connection failed. Check your `.mcp.json` configuration."
- **No index**: report as unbuilt state and guide to `/maencof:maencof-build`
