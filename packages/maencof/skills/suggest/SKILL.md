---
name: suggest
user_invocable: true
description: SA + Jaccard similarity based link suggestion — discover related documents and recommend new connections
version: 1.0.0
complexity: simple
context_layers: [1, 2, 3, 4, 5]
plugin: maencof
---

# suggest — Link Suggestion

Recommends related document connections using Spreading Activation and Jaccard similarity.
Helps fill gaps in the knowledge graph by discovering potential links.

> **Difference from `/maencof:explore`**: explore performs SA-based traversal from a seed node. suggest focuses on recommending new connections that don't yet exist.

## When to Use This Skill

- Find related documents to link after creating a new document
- Expand an existing document's connections
- Exploratory queries like "what documents are related to this?"
- Resolve orphan nodes detected by `/maencof:doctor`

## Prerequisites

- The maencof index must be built (`.maencof/index.json` must exist)
- If no index: "No index found. Please run `/maencof:build` first."

## Workflow

### Step 1 — Check Index Status

Call `kg_status()`. Abort if no index. Warn if stale.

### Step 2 — Determine Target

Determine the suggestion target from user input: file path, tags, free text, or ask the user.

### Step 3 — Run Link Suggestion

Call `kg_suggest_links` with the determined target parameters.

### Step 4 — Display Results

Show suggestions in a table with Document, Layer, Score, Reason columns.

### Step 5 — User Action

User selects a suggestion to view details via `maencof_read`, or manually adds links.

> See **reference.md** for detailed step logic, display format, and target determination rules.

## Available MCP Tools

| Tool | Purpose |
|------|---------|
| `kg_status` | Check index status (stale check) |
| `kg_suggest_links` | SA + Jaccard based link suggestion (primary tool) |
| `maencof_read` | Read suggested document content (optional detail view) |

## Options

```
/maencof:suggest [path|tags|text] [--max <1-20>] [--min-score <0.0-1.0>]
```

| Option | Default | Description |
|--------|---------|-------------|
| `path` | none | Target document path |
| `tags` | none | Comma-separated tag list |
| `text` | none | Free text content hint |
| `--max` | 5 | Maximum number of suggestions (1-20) |
| `--min-score` | 0.2 | Minimum similarity score threshold (0.0-1.0) |

## Usage Examples

```
/maencof:suggest 02_Derived/typescript-patterns.md
/maencof:suggest react,hooks,state-management
/maencof:suggest knowledge graph traversal algorithms --max 10
```

## Resources

- **reference.md**: Detailed step logic, display format, target determination, error handling
