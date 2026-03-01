---
name: rebuild
user_invocable: true
description: Force full index rebuild — ignore existing cache and rebuild the entire index from scratch
version: 1.0.0
complexity: simple
context_layers: [1, 2, 3, 4, 5]
orchestrator: rebuild skill
plugin: maencof
---

# rebuild — Force Full Index Rebuild

Ignores the existing `.maencof/` index cache and rebuilds the entire knowledge graph from scratch.
This is the force mode of `/maencof:build`.

## When to Use This Skill

- When the index is corrupted or inconsistent
- When an incremental build is incomplete after large-scale file moves/deletions/additions
- When `/maencof:doctor` recommends a rebuild
- When a migration is needed after an index structure change

## Workflow

### Step 1 — Pre-check

Query the current index status and save a snapshot before rebuilding.

```
kg_status()
```

Record previous state:
- Node count: {before_nodes}
- Edge count: {before_edges}
- Last built: {last_built}
- Stale node count: {stale_count}

### Step 2 — Backup Existing Index (unless `--no-backup`)

Before rebuilding, copy `.maencof/index.json` to `.maencof/index.json.bak` if it exists.
This backup is used for rollback if Step 4 fails.
Skip this step when `--no-backup` is specified.

### Step 3 — User Confirmation

Request confirmation since a rebuild can take time.

```
Starting full rebuild.
- Existing index: {before_nodes} nodes, {before_edges} edges
- Estimated time: a few seconds to a few minutes depending on document count

Do you want to continue? [Yes/No]
```

If `--force` is specified, proceed immediately without confirmation.

### Step 4 — Run Full Rebuild

Call `kg_build` with `force=true`.

```
kg_build(force=true)
```

Display progress in real time:
```
Rebuilding...
  [1/4] Scanning files...
  [2/4] Parsing documents...
  [3/4] Building graph...
  [4/4] Saving index...
Done!
```

### Step 5 — Result Report

Report results comparing before and after the rebuild.

```
## Rebuild Complete

| Item | Before | After | Change |
|------|--------|-------|--------|
| Node count | {before_nodes} | {after_nodes} | {delta_nodes:+d} |
| Edge count | {before_edges} | {after_edges} | {delta_edges:+d} |

Build time: {duration}s
```

> Note: Layer-by-layer node distribution is not available from `kg_status`/`kg_build` responses.
> To inspect layer distribution, use `/maencof:diagnose --verbose`.

If the change is large (nodes ±20% or more), display a warning and recommend investigating the cause.

## MCP Tools

| Tool | Purpose |
|------|---------|
| `kg_status` | Query status before and after rebuild |
| `kg_build` | Run full rebuild (force=true) |

## Options

```
/maencof:rebuild [options]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--force` | — | Rebuild immediately without confirmation |
| `--no-backup` | — | Skip existing index backup (faster) |

## Usage Examples

```
/maencof:rebuild
/maencof:rebuild --force
```

## Difference from `/maencof:build`

| | `/maencof:build` | `/maencof:rebuild` |
|---|---|---|
| Mode | incremental build (default) / full (`--full`) | always full rebuild |
| Cache | process changed files only | ignore all cache |
| Speed | fast | slow (full processing) |
| Use case | routine updates | recovery/migration |

## Error Handling

- **Build failure**: display error message, automatically restore previous index (if backup exists)
- **Insufficient disk space**: warn and abort, guide to clean up temporary files
- **Permission error**: guide to check path permissions
