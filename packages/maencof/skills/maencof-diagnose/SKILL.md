---
name: maencof-diagnose
user_invocable: true
description: "[maencof:maencof-diagnose] Quickly checks knowledge graph index status — freshness, stale node ratio, and rebuild recommendation — without running a full diagnostic scan like checkup."
argument-hint: "[--verbose]"
version: "1.0.0"
complexity: simple
context_layers: []
orchestrator: maencof-diagnose skill
plugin: maencof
---

# maencof-diagnose — Index Health Diagnostic

A lightweight version of `/maencof:maencof-checkup`. Performs a quick status check only without auto-fix.
Reports index freshness, stale node ratio, and whether a rebuild is recommended.

> **Difference from `/maencof:maencof-checkup`**: diagnose is read-only and fast (calls `mcp_t_kg_status` only). checkup runs a full scan with auto-fix suggestions.

## When to Use This Skill

- Quick check if the index is up to date
- Pre-flight status check before search/exploration
- Simple pre-check before running `/maencof:maencof-checkup`

## Prerequisites

- The maencof plugin must be initialized
- Can run even without an index (reports as unbuilt state)

## Workflow

### Step 1 — Query Index Status

Call `mcp_t_kg_status()` to retrieve nodeCount, edgeCount, lastBuiltAt, staleNodeCount, freshnessPercent, rebuildRecommended.

### Step 2 — Generate Report

Format results based on health state:

- **OK** (stale < 10%): display stats, status OK
- **Caution** (stale 10-30%): display stats, recommend `/maencof:maencof-build --force --reset-cache`
- **Critical** (stale > 30% or no index): recommend `/maencof:maencof-build --full` or `/maencof:maencof-checkup`

Include **sub-layer distribution** from `mcp_t_kg_status` response (`subLayerDistribution` field):
```
Sub-Layer Distribution:
  L3: relational (N), structural (N), topical (N), unclassified (N)
  L5: buffer (N), boundary (N), unclassified (N)
```

> See **reference.md** for full report format templates and action matrix.

### Step 3 (Optional) — Verbose Mode

When `--verbose` is specified: list stale node paths, modified file count, Layer distribution, and **sub-layer consistency check** (detect mismatches between directory path and frontmatter `sub_layer` field).

Example consistency warning:
```
Sub-Layer Consistency Issues:
  - 03_External/relational/doc.md has sub_layer: "topical" (expected: "relational")
  - 05_Context/buffer/old.md has sub_layer: "boundary" (expected: "buffer")
```

## Available MCP Tools

| Tool | Purpose |
|------|---------|
| `mcp_t_kg_status` | Query index status (primary tool) |

## Options

```
/maencof:maencof-diagnose [--verbose]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--verbose` | false | Detailed info (stale node list, Layer distribution) |

## Usage Examples

```
/maencof:maencof-diagnose
/maencof:maencof-diagnose --verbose
```

## Resources

- **reference.md**: Report format templates, action matrix, verbose mode detail, kg_status response fields
