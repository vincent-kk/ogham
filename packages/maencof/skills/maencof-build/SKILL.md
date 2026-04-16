---
name: maencof-build
user_invocable: true
description: "[maencof:maencof-build] Builds or refreshes the knowledge graph index. Runs incrementally by default to reprocess only changed files, performs a full rebuild when --full or --force is specified, and discards the .maencof cache entirely before rebuilding when --reset-cache is set (absorbs the former maencof-rebuild skill)."
argument-hint: "[--full] [--force] [--reset-cache] [--no-backup] [--dry-run]"
version: "1.1.0"
complexity: medium
context_layers: [1, 2, 3, 4, 5]
orchestrator: maencof-build skill
plugin: maencof
---

# maencof-build — Index Build & Rebuild

Scans markdown documents in the vault and builds the knowledge graph index.
Uses incremental build by default, reprocessing only changed files.
Supports forced full rebuild (`--full` / `--force`) and cache-discarding rebuild
(`--reset-cache`) for recovery from corruption, large-scale file moves, or index structure migration.

## When to Use This Skill

- Building the initial index after setting up the vault for the first time
- After adding or modifying a large number of documents
- When `/maencof:maencof-checkup` recommends a rebuild
- When a full rebuild is needed without discarding cache (`--full` or `--force`)
- When the index is corrupted or inconsistent (`--force --reset-cache`)
- When incremental build is incomplete after large-scale moves, deletions, or additions (`--force --reset-cache`)
- When migrating after an index structure change (`--force --reset-cache`)

## Workflow

### Step 1 — Status Check (or Cache Reset)

If `--reset-cache` is specified:

1. Unless `--no-backup` is also set, copy `.maencof/index.json` to `.maencof/index.json.bak` so Step 2 failures can roll back.
2. Remove the existing `.maencof/` cache contents (`index.json`, `backlink-index.json`, `stale-nodes.json`, etc.) so the next build starts from scratch.
3. Skip the stale-ratio check and proceed as a full rebuild.

Otherwise, check the current index status with the `mcp_t_kg_status` MCP tool.

- No index -> run a full build
- Stale < 10% -> run an incremental build
- Stale >= 10% -> recommend a full build and ask for user confirmation
- `--full` or `--force` -> proceed with a full rebuild immediately without asking for confirmation

### Step 2 — Run Build

Build pipeline:
```
1. VaultScanner: collect file list + mtime
2. DocumentParser: parse Frontmatter + links (changed files only)
3. GraphBuilder: construct/update graph
4. DAGConverter: cycle detection + handling
5. WeightCalculator: calculate weights
6. MetadataStore: save to .maencof/ JSON
```

For incremental build: recompute only changed files + 1-hop neighbors.
For full/force mode: call `mcp_t_kg_build(force=true)` to reprocess every node.

### Step 3 — Completion Report

```
Index build complete
Nodes: 123 | Edges: 456
Time: 2.3s
Build type: incremental (12 files updated)
```

For full rebuilds triggered by `--force` or `--reset-cache`, include before/after deltas
when the prior index existed (from `mcp_t_kg_status` snapshot taken in Step 1 before cache reset):

```
## Rebuild Complete

| Item | Before | After | Change |
|------|--------|-------|--------|
| Node count | {before_nodes} | {after_nodes} | {delta_nodes:+d} |
| Edge count | {before_edges} | {after_edges} | {delta_edges:+d} |
```

If the change is large (nodes ±20% or more), warn and recommend investigating the cause.

> Note: Layer-by-layer node distribution is not available from `mcp_t_kg_status` / `mcp_t_kg_build` responses.
> To inspect layer distribution, use `/maencof:maencof-checkup --quick --verbose`.

## Available MCP Tools

| Tool | Purpose |
|------|---------|
| `mcp_t_kg_status` | Check current index status (pre- and post-rebuild snapshots) |
| `mcp_t_kg_build` | Run index build (incremental: `force=false`, full: `force=true`) |

## Error Handling

- **No vault path**: "Vault not initialized. Please run `/maencof:maencof-setup` first."
- **kg_build failure with `--reset-cache`**: restore `.maencof/index.json.bak` if it exists; otherwise report the error and leave `.maencof/` empty.
- **kg_build failure without `--reset-cache`**: display error details; the existing index is preserved unchanged.
- **Stale >= 10% but user declines full build**: proceed with incremental build and display stale warning in completion report.
- **`--dry-run`**: scan and parse files, compute change list, report what would be updated — no index write occurs, and `--reset-cache` is treated as a preview (cache is NOT deleted).
- **Insufficient disk space**: warn and abort; guide to clean up temporary files.

## Options

```
/maencof:maencof-build [--full] [--force] [--reset-cache] [--no-backup] [--dry-run]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--full` | false | Force a full rebuild (equivalent to `--force`) |
| `--force` | false | Alias of `--full`; skip the stale-ratio confirmation prompt and run a full rebuild immediately |
| `--reset-cache` | false | Discard `.maencof/` cache contents before rebuilding (recovery / migration mode). Implies a full rebuild. |
| `--no-backup` | false | Skip `.maencof/index.json.bak` snapshot when `--reset-cache` is used |
| `--dry-run` | false | Preview changes only; no cache reset and no index write |

## Usage Examples

```
/maencof:maencof-build
/maencof:maencof-build --full
/maencof:maencof-build --force
/maencof:maencof-build --force --reset-cache
/maencof:maencof-build --dry-run
```

## Migration Note

The former `maencof-rebuild` skill has been merged into this skill.
Replace any prior `maencof-rebuild` invocation with `/maencof:maencof-build --force --reset-cache`.
The `--no-backup` flag is preserved for faster rebuilds when an explicit backup is unnecessary.
