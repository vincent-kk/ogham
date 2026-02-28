---
name: recall
user_invocable: true
description: Knowledge search/recall — traverse the knowledge graph with a natural-language query and return relevant documents
version: 1.0.0
complexity: simple
plugin: coffaen
---

# recall — Knowledge Search/Recall

Accepts a natural-language query, traverses the coffaen knowledge graph using the Spreading Activation (SA) algorithm,
finds related documents, assembles context, and returns it.

## When to Use This Skill

- When searching for knowledge recorded in the past
- When looking for documents related to a specific topic
- When loading context from the knowledge space
- When a lightweight single-query alternative to `/coffaen:explore` is needed

## Prerequisites

- The coffaen index must be built (`.coffaen/index.json` must exist)
- If no index: "No index found. Please run `/coffaen:build` first."

## Workflow

### Step 1 — Query Parsing

Extract core keywords and intent from user input.

- Natural-language query → list of search keywords
- Mode detection: `--summary` (summary mode, default) / `--detail` (detail mode)
- Layer filter detection: `--layer=1` through `--layer=4`

### Step 2 — Call kg_search

Call the `kg_search` MCP tool to find seed nodes.

```
kg_search(seed: [keyword1, keyword2, ...], max_results=10, layer_filter?)
```

If no results: "No related documents found. Try different keywords."

### Step 3 — Neighbor Exploration (kg_navigate)

Traverse inbound and outbound links from seed nodes.

```
kg_navigate(path: selected_node_path, include_inbound=true, include_outbound=true, include_hierarchy=true)
```

### Step 4 — Context Assembly (kg_context)

Assemble context for the top activated nodes.

```
kg_context(query: search_query_string, token_budget=2000)
```

### Step 5 — Result Formatting

**Summary mode (default)**:
```
## Search Results: "{query}"

Found {N} related documents.

1. **{title}** (Layer {N}, relevance {score}%)
   {1-2 line summary}
   Path: {path}

2. ...

For more detail: `/coffaen:recall {query} --detail`
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
| `kg_search` | Keyword-based seed node search |
| `kg_navigate` | Neighbor node lookup (inbound/outbound/hierarchy link traversal) |
| `kg_context` | Assemble node context |

## Options

```
/coffaen:recall <query> [options]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--summary` | default | Summary mode (title + 1-2 line summary) |
| `--detail` | — | Detail mode (full content excerpt) |
| `--layer=N` | all | Search a specific Layer only (1-4) |
| `--limit=N` | 10 | Maximum number of results |

## Usage Examples

```
/coffaen:recall react state management patterns
/coffaen:recall project goals --detail
/coffaen:recall schedule --layer=4
/coffaen:recall core values --layer=1 --detail
```

## Error Handling

- **No index**: guide to run `/coffaen:build`
- **No results**: suggest similar keywords + guide to `/coffaen:explore` for interactive exploration
- **Stale index**: display stale warning and continue
