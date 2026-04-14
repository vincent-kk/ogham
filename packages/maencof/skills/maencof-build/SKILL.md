---
name: maencof-build
user_invocable: true
description: "[maencof:maencof-build] Builds or refreshes the knowledge graph index. Runs incrementally by default to reprocess only changed files, or performs a full rebuild when explicitly specified."
argument-hint: "[--full] [--dry-run]"
version: "1.0.0"
complexity: medium
context_layers: [1, 2, 3, 4, 5]
orchestrator: maencof-build skill
plugin: maencof
---

# maencof-build — Index Build

Scans markdown documents in the vault and builds the knowledge graph index.
Uses incremental build by default, reprocessing only changed files.

## When to Use This Skill

- Building the initial index after setting up the vault for the first time
- After adding or modifying a large number of documents
- When `/maencof:maencof-diagnose` recommends a rebuild
- When a full rebuild is needed (use the `--full` option)

## Workflow

### Step 1 — Status Check

Check the current index status with the `mcp_t_kg_status` MCP tool.
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
6. MetadataStore: save to .maencof/ JSON
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
| `mcp_t_kg_status` | Check current index status |
| `mcp_t_kg_build` | Run index build (incremental: `force=false`, full: `force=true`) |

## Error Handling

- **No vault path**: "Vault not initialized. Please run `/maencof:maencof-setup` first."
- **kg_build failure**: display error details; existing index is preserved unchanged
- **Stale >= 10% but user declines full build**: proceed with incremental build and display stale warning in completion report
- **`--dry-run`**: scan and parse files, compute change list, report what would be updated — no index write occurs

## Options

```
/maencof:maencof-build [--full] [--dry-run]
```

| Option | Description |
|--------|-------------|
| `--full` | Force a full rebuild |
| `--dry-run` | Preview changes only (no actual build) |
