---
name: explore
user_invocable: true
description: SA-based interactive knowledge graph exploration — spread from a seed and discover hidden connections
version: 1.0.0
complexity: medium
context_layers: [1, 2, 3, 4, 5]
orchestrator: explore skill
plugin: coffaen
---

# explore — Interactive Knowledge Exploration

Interactively traverses the knowledge graph using Spreading Activation (SA).
Energy spreads from a seed node, uncovering unexpected connections along the way.

## When to Use This Skill

- When you want to explore all knowledge related to a specific topic
- When you want to discover hidden connections between pieces of knowledge
- Divergent exploration in the form of "what is related to this?"
- When deeper exploration than `/coffaen:recall` is needed

## Prerequisites

- The coffaen index must be built (`.coffaen/index.json` must exist)
- If no index: "No index found. Please run `/coffaen:build` first."
- Check index status first with `kg_status`

## Workflow

### Step 1 — Check Index Status

```
kg_status()
```

- No index -> "No index found. Please run `/coffaen:build` first." (abort)
- `rebuildRecommended: true` -> warn before exploration: "The index is stale. Results may be inaccurate. `/coffaen:rebuild` is recommended."
- Ask user whether to continue if stale

### Step 2 — Determine Exploration Starting Point

Determine the seed from user input:

- Direct file path (contains `.md` or `/`) -> that node becomes the seed
- Keyword -> determine seed by matching Frontmatter tags/title
- Not specified -> ask user to enter a topic to explore

If a Layer filter (`--layer`) is specified, only documents in that Layer are allowed as seed candidates.

### Step 3 — SA-Based Spreading Exploration

Run SA via the `kg_search` MCP tool:

```
kg_search(
  seed: [seed path or keyword],
  max_results: 10,
  decay: 0.7,
  threshold: 0.1,
  max_hops: --hops value (default 5),
  layer_filter: --layer value (default none)
)
```

If 0 results: "Seed node not found. Please try a different keyword." then request re-entry.

### Step 4 — Display Results (Grouped by Layer)

Display exploration results grouped by Layer:

```
## Exploration Results: "{seed}"

### Layer 1 — Core Identity
1. **{title}** (relevance {score}%)
   Path: {path}

### Layer 2 — Derived
2. **{title}** (relevance {score}%)
   Path: {path}
...

Enter a number for more detail. Enter 'q' to exit.
```

### Step 5 — Neighbor Node Lookup (Optional Deep Exploration)

When the user selects a number, look up neighbors with `kg_navigate`:

```
kg_navigate(
  path: selected node path,
  include_inbound: true,
  include_outbound: true,
  include_hierarchy: true
)
```

Display inbound/outbound/parent/child/sibling nodes and ask whether to continue exploring.

### Step 6 — Interactive Expansion (Up to 3 Rounds)

If the user selects a neighbor node as a new seed, re-run from Step 3.
After 3 rounds: "Exploration depth limit reached."

## Available MCP Tools

| Tool | Purpose |
|------|---------|
| `kg_status` | Check index status (stale check) |
| `kg_search` | SA-based related document search |
| `kg_navigate` | Look up a node's neighbors (inbound/outbound links, hierarchy) |
| `kg_context` | Assemble token-optimized context blocks |
| `coffaen_read` | Read the full content of a selected document |

## Options

> Options are interpreted by the LLM in natural language. Not strict CLI parsing.

```
/coffaen:explore [seed] [--hops <1-10>] [--layer <1-5>] [--detail]
```

| Option | Default | Description |
|--------|---------|-------------|
| `seed` | none (input requested) | Exploration starting point (path or keyword) |
| `--hops` | 5 | Maximum hop count (1-10) |
| `--layer` | all | Layer filter (1-5, multiple allowed) |
| `--detail` | false | Include document body excerpts in results |

## Usage Examples

```
/coffaen:explore react
/coffaen:explore 01_Core/identity.md --hops 3
/coffaen:explore machine-learning --layer 3
/coffaen:explore project goals --detail
```

## Error Handling

- **No index**: guide to run `/coffaen:build`
- **Seed not found**: suggest similar keywords and request re-entry
- **No results**: suggest increasing hops (`--hops 10`) or trying different keywords
- **Stale index**: display warning and continue (user choice)

## Quick Reference

```
# Explore by keyword
/coffaen:explore machine-learning

# Explore from a specific document
/coffaen:explore 01_Core/identity.md

# Layer filter + deep exploration
/coffaen:explore AI --layer 2 --hops 8

# Include detailed body content
/coffaen:explore values --detail
```
