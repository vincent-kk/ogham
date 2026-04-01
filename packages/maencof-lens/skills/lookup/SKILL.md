---
name: lookup
user_invocable: true
description: Search vault knowledge graph via Spreading Activation, read the top result document, and return a structured summary. Single-document quick reference pipeline for targeted knowledge retrieval from development contexts. Use when a specific topic needs a quick answer from vault — design docs, architecture references, or technical knowledge lookup.
version: 1.1.0
complexity: simple
plugin: maencof-lens
---

# lookup — Vault Knowledge Lookup

Accepts a keyword/query, searches the vault knowledge graph, reads the top result, and returns a summary.

## When to Use This Skill

- When searching vault knowledge for a specific topic
- Quick reference lookup for design docs, architecture refs, technical knowledge
- When a single document summary is sufficient (use `/maencof-lens:context` for multi-doc assembly)

## Prerequisites

- `.maencof-lens/config.json` must exist in project root
- Vault index must be built (`.maencof/index.json` in the vault)
- If no config: "No lens config found. Run `/maencof-lens:setup-lens` to configure."
- If no index: "Vault index not built. Run `kg_build` in a maencof session."

## Workflow

### Step 1 — Keyword Extraction

Extract core keywords from user input.

- Natural-language query → list of search keywords
- Flag detection: `--vault`, `--layer`, `--detail`

### Step 2 — Call lens_search

Call the `lens_search` MCP tool to find relevant documents.

```
lens_search(seed: [keyword1, keyword2, ...], max_results: 5, vault?: specified_vault, layer_filter?: specified_layers)
```

If no results: "관련 문서를 찾지 못했습니다. 다른 키워드를 시도하세요."

### Step 3 — Read Top Result (lens_read)

Read the content of the top search result.

```
lens_read(path: top_result.path, vault: same_vault)
```

If `--detail` flag is set, read the top 3 results instead of just 1.

### Step 4 — Summarize & Format

Summarize document content in context of the query (1-3 paragraphs).
Show additional results as a numbered list for optional deeper exploration.

**Output format**:
```
## Lookup: "{keyword}"

### {title} (L{layer}, relevance {score}%)
{1-3 paragraph summary}

Path: {path}

---
### Other Results
1. **{title}** — {one-line summary} (L{layer}, {score}%)
2. ...

For deeper exploration: `/maencof-lens:lookup {keyword} --detail`
```

## MCP Tools

| Tool | Purpose |
|------|---------|
| `lens_search` | SA 기반 키워드 검색 |
| `lens_read` | 문서 내용 읽기 |

## Options

```
/maencof-lens:lookup <keyword> [--vault <name>] [--layer <N>] [--detail]
```

| Option | Default | Description |
|--------|---------|-------------|
| `keyword` | required | 검색 키워드 (자연어 가능) |
| `--vault` | default vault | 대상 vault 지정 |
| `--layer` | vault config | Layer 필터 (vault 상한 내) |
| `--detail` | false | 상위 3개 문서까지 전문 읽기 |

## Usage Examples

```
/maencof-lens:lookup FCA architecture
/maencof-lens:lookup NER model --vault work
/maencof-lens:lookup design patterns --layer 3
/maencof-lens:lookup knowledge graph --detail
```

## Error Handling

- **No lens config**: guide to `/maencof-lens:setup-lens`
- **No index**: guide to run `kg_build` in maencof session
- **No results**: suggest different keywords
- **Read failure**: show error and suggest `lens_search` results as alternatives
