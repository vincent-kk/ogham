---
name: lookup
user_invocable: true
description: "[maencof-lens:lookup] Search vault knowledge graph via Spreading Activation, read the top result document, and return a structured summary. Single-document quick reference pipeline for targeted knowledge retrieval from development contexts. Use when a specific topic needs a quick answer from vault — design docs, architecture references, or technical knowledge lookup."
argument-hint: "<query> [--vault NAME] [--layer N,...] [--detail]"
version: 1.1.0
complexity: simple
plugin: maencof-lens
---

# lookup — Vault Knowledge Lookup

Search → Read → Summarize pipeline for single-document quick reference.
For multi-doc context assembly, use `/maencof-lens:brief` instead.

## When to Use

- Quick reference lookup for a specific topic (design docs, architecture refs, technical knowledge)
- Single-document summary is sufficient
- **Not** for multi-document context loading — use `/maencof-lens:brief`

## Prerequisites

- `.maencof-lens/config.json` required — if missing: "Run `/maencof-lens:setup`"
- Vault index required (`.maencof/index.json`) — if missing: "Run `kg_build` in a maencof session"

## Workflow

### Step 1 — Search (`mcp__plugin_maencof-lens_t__search`)

Extract keywords from user input and search the vault knowledge graph.

Cross-language recall: include each key concept in BOTH the user's working language and English as **separate** seed items (they are unioned), since vault docs may be tagged or titled in either language. Do not anchor to one language, and never combine two languages in a single seed item (a multi-word item is AND-matched).

```
mcp__plugin_maencof-lens_t__search(seed: [keyword1, keyword1_en, keyword2, ...], max_results: 5, vault?: name, layer_filter?: layers)
```

Optional SA tuning parameters — pass only when user explicitly specifies:
`decay`, `threshold`, `max_hops`, `sub_layer`

No results → suggest different keywords.

### Step 2 — Read Top Result (`mcp__plugin_maencof-lens_t__read`)

```
mcp__plugin_maencof-lens_t__read(path: top_result.path, vault: same_vault)
```

- Default: read top 1 result
- With `--detail`: read top 3 results
- Layer-restricted document → skip and try next result

### Step 3 — Summarize & Present

Summarize document content in context of the query (1-3 paragraphs).
Show remaining results as a numbered list for optional deeper exploration.

```markdown
## Lookup: "{keyword}"

### {title} (L{layer}, relevance {score}%)

{1-3 paragraph summary in context of the query}

Path: {path}

---

### Other Results

1. **{title}** — {one-line summary} (L{layer}, {score}%)
2. ...

For deeper exploration: `/maencof-lens:lookup {keyword} --detail`
```

## MCP Tools

| Tool           | Purpose                                    |
| -------------- | ------------------------------------------ |
| `mcp__plugin_maencof-lens_t__search` | SA-based keyword search across vault graph |
| `mcp__plugin_maencof-lens_t__read`   | Read document content by path              |

## Options

```
/maencof-lens:lookup <query> [--vault <name>] [--layer <N,N,...>] [--detail]
```

| Option     | Default       | Description                                                                                                                         |
| ---------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `query`    | required      | Search query (natural language)                                                                                                     |
| `--vault`  | default vault | Target vault name                                                                                                                   |
| `--layer`  | vault config  | Layer filter as comma-separated list (e.g., `2,3,4`). Intersected with vault config ceiling — only layers present in both are used. |
| `--detail` | false         | Read top 3 results instead of 1                                                                                                     |

## Usage Examples

```
/maencof-lens:lookup FCA architecture
/maencof-lens:lookup NER model --vault work
/maencof-lens:lookup design patterns --layer 3
/maencof-lens:lookup knowledge graph --detail
```

## Error Handling

- **No lens config** → guide to `/maencof-lens:setup`
- **No index** → guide to run `kg_build` in maencof session
- **No results** → suggest different keywords
- **Read failure** → show error and suggest alternative results from `mcp__plugin_maencof-lens_t__search`
