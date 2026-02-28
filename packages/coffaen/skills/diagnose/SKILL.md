---
name: diagnose
user_invocable: true
description: Lightweight index health diagnostic — quick status check and recommended actions via kg_status
version: 1.0.0
complexity: simple
context_layers: [1, 2]
orchestrator: diagnose skill
plugin: coffaen
---

# diagnose — Index Health Diagnostic

A lightweight version of `/coffaen:doctor`. Performs a quick status check only without auto-fix.
Reports index freshness, stale node ratio, and whether a rebuild is recommended — immediately.

## When to Use This Skill

- When you want to quickly check if the index is up to date
- Pre-flight status check before search/exploration
- A simple pre-check before running `/coffaen:doctor`
- Status check in a build pipeline

## Prerequisites

- The coffaen plugin must be initialized
- Can run even without an index (reports as unbuilt state)

## Workflow

### Step 1 — Query Index Status

Query basic status with the `kg_status` MCP tool:

```
kg_status()
```

Response fields:
- `nodeCount`: total node count
- `edgeCount`: total edge count
- `lastBuiltAt`: last build timestamp
- `staleNodeCount`: stale node count
- `freshnessPercent`: index freshness (%)
- `rebuildRecommended`: whether a full rebuild is recommended

### Step 2 — Generate Diagnostic Report

Format and output the query results:

**Healthy state (stale < 10%)**:
```
coffaen Index Status
━━━━━━━━━━━━━━━━━━━━━━━━━━
Nodes:         {N}
Edges:         {N}
Last built:    {time ago / YYYY-MM-DD HH:mm}
Stale ratio:   {N}% ({staleCount}) — OK
Freshness:     {freshnessPercent}%
━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: OK
```

**Caution state (stale 10–30%)**:
```
coffaen Index Status
━━━━━━━━━━━━━━━━━━━━━━━━━━
Nodes:         {N}
Stale ratio:   {N}% — Caution
━━━━━━━━━━━━━━━━━━━━━━━━━━
Recommended: Run /coffaen:rebuild.
```

**Critical state (stale > 30% or no index)**:
```
coffaen Index Status
━━━━━━━━━━━━━━━━━━━━━━━━━━
Index: missing / critically stale
━━━━━━━━━━━━━━━━━━━━━━━━━━
Recommended: Run /coffaen:build or /coffaen:doctor
```

### Step 3 — Present Recommended Actions

Guide the next steps based on status:

| Status | Recommended Action |
|--------|-------------------|
| OK (stale < 10%) | none |
| Caution (stale 10–30%) | `/coffaen:rebuild` |
| Critical (stale > 30%) | `/coffaen:build --full` |
| No index | `/coffaen:build` |
| Suspected structural issue | `/coffaen:doctor` full diagnosis |

### Step 4 (Optional) — Verbose Mode

When `--verbose` is specified, display additional information:

- List of stale node paths (up to 10)
- Number of files modified since last build
- Node distribution by Layer

## Available MCP Tools

| Tool | Purpose |
|------|---------|
| `kg_status` | Query index status (primary tool) |

## Options

> Options are interpreted by the LLM in natural language.

```
/coffaen:diagnose [--verbose]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--verbose` | false | Detailed info (stale node list, Layer distribution) |

## Usage Examples

```
/coffaen:diagnose
/coffaen:diagnose --verbose
```

## Error Handling

- **kg_status failure**: "MCP server connection failed. Check your `.mcp.json` configuration."
- **No index**: report as unbuilt state and guide to `/coffaen:build`

## Quick Reference

```
# Quick status check
/coffaen:diagnose

# Detailed report
/coffaen:diagnose --verbose

# Difference from doctor
# diagnose: read-only, fast (calls kg_status only)
# doctor: full scan + auto-fix suggestions (takes more time)
```
