---
name: maencof-recall
user_invocable: true
description: "[maencof:maencof-recall] Searches the knowledge vault with a natural-language query using Spreading Activation, retrieving and ranking the most relevant documents across all five layers."
argument-hint: "<query> [--layer N] [--sub-layer NAME] [--detail]"
version: "1.0.0"
complexity: simple
context_layers: [1, 2, 3, 4, 5]
orchestrator: maencof-recall skill
plugin: maencof
---

# maencof-recall — Knowledge Search/Recall

Accepts a natural-language query, traverses the maencof knowledge graph using the Spreading Activation (SA) algorithm,
finds related documents, assembles context, and returns it.

## When to Use This Skill

- When searching for knowledge recorded in the past
- When looking for documents related to a specific topic
- When loading context from the knowledge space
- When a lightweight single-query alternative to `/maencof:maencof-explore` is needed

## Prerequisites

- The maencof index must be built (`.maencof/index.json` must exist)
- If no index: "No index found. Please run `/maencof:maencof-build` first."

## Workflow

### Step 1 — Query Parsing

Extract core keywords and intent from user input.

- Natural-language query → list of search keywords
- Mode detection: `--summary` (summary mode, default) / `--detail` (detail mode)
- Layer filter detection: `--layer=1` through `--layer=5`

### Step 2 — Call kg_search

Call the `mcp_t_kg_search` MCP tool to find seed nodes.

```
mcp_t_kg_search(seed: [keyword1, keyword2, ...], max_results=10, layer_filter?, sub_layer?)
```

If no results: "No related documents found. Try different keywords."

### Step 3 — Neighbor Exploration (kg_navigate)

Traverse inbound and outbound links from seed nodes.

```
mcp_t_kg_navigate(path: selected_node_path, include_inbound=true, include_outbound=true, include_hierarchy=true)
```

### Step 4 — Context Assembly (kg_context)

Assemble context for the top activated nodes.

```
mcp_t_kg_context(query: search_query_string, token_budget=2000)
```

### Step 5 — Result Formatting

**Summary mode (default)**:
```
## Search Results: "{query}"

Found {N} related documents.

1. **{title}** (Layer {N}{sub_layer ? ` / ${sub_layer}` : ''}, relevance {score}%)
   {1-2 line summary}
   Path: {path}

2. ...

For more detail: `/maencof:maencof-recall {query} --detail`
```

**Detail mode (`--detail`)**:
```
## Search Results: "{query}"

### {title}
- **Path**: {path}
- **Layer**: {layer_name}
- **Tags**: {tags}
- **Relevance**: {score}%
- **Linked documents**: {linked_docs}

{excerpt of document main content}

---
```

## MCP Tools

| Tool | Purpose |
|------|---------|
| `mcp_t_kg_search` | Keyword-based seed node search |
| `mcp_t_kg_navigate` | Neighbor node lookup (inbound/outbound/hierarchy link traversal) |
| `mcp_t_kg_context` | Assemble node context |

## Options

```
/maencof:maencof-recall <query> [options]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--summary` | default | Summary mode (title + 1-2 line summary) |
| `--detail` | — | Detail mode (full content excerpt) |
| `--layer=N` | all | Search a specific Layer only (1-5) |
| `--sub-layer=X` | none | Filter by sub-layer: relational/structural/topical (L3), buffer/boundary (L5) |
| `--limit=N` | 10 | Maximum number of results |

## Usage Examples

```
/maencof:maencof-recall react state management patterns
/maencof:maencof-recall project goals --detail
/maencof:maencof-recall schedule --layer=4
/maencof:maencof-recall core values --layer=1 --detail
/maencof:maencof-recall alice --sub-layer=relational
/maencof:maencof-recall project moc --sub-layer=boundary
```

## Error Handling

- **No index**: guide to run `/maencof:maencof-build`
- **No results**: suggest similar keywords + guide to `/maencof:maencof-explore` for interactive exploration
- **Stale index**: display stale warning and continue
