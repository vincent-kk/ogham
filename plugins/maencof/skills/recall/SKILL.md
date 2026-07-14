---
name: recall
user_invocable: true
description: '[maencof:recall] Searches the knowledge vault with a natural-language query using Spreading Activation, retrieving and ranking the most relevant documents across all five layers.'
argument-hint: '<query> [--layer N] [--sub-layer NAME] [--summary] [--detail] [--limit N]'
version: '1.0.0'
complexity: simple
context_layers: [1, 2, 3, 4, 5]
orchestrator: recall skill
plugin: maencof
---

# recall — Knowledge Search/Recall

Accepts a natural-language query, traverses the maencof knowledge graph using the Spreading Activation (SA) algorithm,
finds related documents, assembles context, and returns it.

## When to Use This Skill

- When searching for knowledge recorded in the past
- When looking for documents related to a specific topic
- When loading context from the knowledge space
- When a lightweight single-query alternative to `/maencof:explore` is needed

## When to Use vs Adjacent Skills

- **`recall`** — one-shot Spreading Activation search. Returns a ranked
  list + optional excerpts in a single turn; no follow-up rounds.
- **`explore`** — interactive multi-round graph traversal (up to 3 rounds).
  Selects a node, inspects neighbors, optionally re-seeds from a neighbor. Use
  when you expect to drill down or pivot several times.

Rule of thumb: know what you want → `recall`. Want to wander → `explore`.

## Prerequisites

- The maencof index must be built (`.maencof/index.json` must exist)
- If no index: "No index found. Please run `/maencof:build` first."

## Workflow

### Step 1 — Query Parsing

Extract core keywords and intent from user input.

- Natural-language query → list of search keywords: keep distilled concept terms only, dropping grammar words (particles, articles, prepositions)
- Disambiguate polysemous/generic nouns by binding a qualifier into the same seed item ("docker image", not bare "image") — a multi-word item is AND-matched
- Cross-language recall: include each key concept in BOTH the user's working language and English as **separate** seed items (they are unioned), since vault docs may be tagged or titled in either language. Do not anchor to one language, and never combine two languages in a single seed item (a multi-word item is AND-matched).
- Mode detection: `--summary` (summary mode, default) / `--detail` (detail mode)
- Layer filter detection: `--layer=1` through `--layer=5`

### Step 2 — Call kg_search

Call the `mcp__plugin_maencof_tools__kg_search` MCP tool to find seed nodes. The search reports index
freshness: if no index exists, stop and guide the user to `/maencof:build`; if the
index is stale, surface a brief warning and continue.

```
mcp__plugin_maencof_tools__kg_search(seed: [keyword1, keyword2, ...], max_results=10, layer_filter?, sub_layer?)
```

If no results: "No related documents found. Try different keywords."

### Step 3 — Neighbor Exploration (kg_navigate)

Traverse inbound and outbound links from seed nodes.

```
mcp__plugin_maencof_tools__kg_navigate(path: selected_node_path, include_inbound=true, include_outbound=true, include_hierarchy=true)
```

### Step 4 — Context Assembly (kg_context)

Assemble context for the top activated nodes.

```
mcp__plugin_maencof_tools__kg_context(query: search_query_string, token_budget=2000)
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

For more detail: `/maencof:recall {query} --detail`
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

| Tool                                     | Purpose                                                          |
| ---------------------------------------- | ---------------------------------------------------------------- |
| `mcp__plugin_maencof_tools__kg_search`   | Keyword-based seed node search                                   |
| `mcp__plugin_maencof_tools__kg_navigate` | Neighbor node lookup (inbound/outbound/hierarchy link traversal) |
| `mcp__plugin_maencof_tools__kg_context`  | Assemble node context                                            |

## Options

```
/maencof:recall <query> [options]
```

| Option          | Default | Description                                                                   |
| --------------- | ------- | ----------------------------------------------------------------------------- |
| `--summary`     | default | Summary mode (title + 1-2 line summary)                                       |
| `--detail`      | —       | Detail mode (full content excerpt)                                            |
| `--layer=N`     | all     | Search a specific Layer only (1-5)                                            |
| `--sub-layer=X` | none    | Filter by sub-layer: relational/structural/topical (L3), buffer/boundary (L5) |
| `--limit=N`     | 10      | Maximum number of results                                                     |

## Usage Examples

```
/maencof:recall react state management patterns
/maencof:recall project goals --detail
/maencof:recall schedule --layer=4
/maencof:recall core values --layer=1 --detail
/maencof:recall alice --sub-layer=relational
/maencof:recall project moc --sub-layer=boundary
```

## Error Handling

- **No index**: guide to run `/maencof:build`
- **No results**: suggest similar keywords + guide to `/maencof:explore` for interactive exploration
- **Stale index**: display stale warning and continue
