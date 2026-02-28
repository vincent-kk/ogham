---
name: build
user_invocable: true
description: Full/incremental knowledge graph index build
version: 1.0.0
complexity: medium
context_layers: [1, 2, 3, 4]
orchestrator: build skill
plugin: coffaen
---

# build — Index Build

Scans markdown documents in the vault and builds the knowledge graph index.
Uses incremental build by default, reprocessing only changed files.

## When to Use This Skill

- Building the initial index after setting up the vault for the first time
- After adding or modifying a large number of documents
- When `/coffaen:diagnose` recommends a rebuild
- When a full rebuild is needed (use the `--full` option)

## Workflow

### Step 1 — Status Check

Check the current index status with the `kg_status` MCP tool.
- No index -> run a full build
- Stale < 10% -> run an incremental build
- Stale >= 10% -> recommend a full build and ask for user confirmation

### Step 2 — Run Build

Build pipeline:
```
1. VaultScanner: collect file list + mtime
2. DocumentParser: parse Frontmatter + links (changed files only)
3. GraphBuilder: construct/update graph
4. DAGConverter: cycle detection + handling
5. WeightCalculator: calculate weights
6. MetadataStore: save to .coffaen/ JSON
```

For incremental build: recompute only changed files + 1-hop neighbors.

### Step 3 — Completion Report

```
Index build complete
Nodes: 123 | Edges: 456
Time: 2.3s
Build type: incremental (12 files updated)
```

## Available MCP Tools

| Tool | Purpose |
|------|---------|
| `kg_status` | Check current index status |
| `kg_build` | Run index build (incremental: `force=false`, full: `force=true`) |

## Error Handling

- **No vault path**: "Vault not initialized. Please run `/coffaen:setup` first."
- **kg_build failure**: display error details; existing index is preserved unchanged
- **Stale >= 10% but user declines full build**: proceed with incremental build and display stale warning in completion report
- **`--dry-run`**: scan and parse files, compute change list, report what would be updated — no index write occurs

## Options

```
/coffaen:build [--full] [--dry-run]
```

| Option | Description |
|--------|-------------|
| `--full` | Force a full rebuild |
| `--dry-run` | Preview changes only (no actual build) |
