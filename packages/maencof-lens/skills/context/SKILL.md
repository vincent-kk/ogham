---
name: context
user_invocable: true
description: Token-budgeted multi-document context assembly from vault via Spreading Activation. Assembles relevant vault documents within a specified token budget for development context injection. Use for broad knowledge loading across multiple documents when working on tasks that require vault reference material — architecture decisions, topic research, or background context gathering.
version: 1.1.0
complexity: simple
plugin: maencof-lens
---

# context — Vault Context Assembly

Assembles a token-budgeted context block from vault documents matching a query.
Use when you need vault knowledge loaded into the current conversation as a structured context block.

## When to Use This Skill

- When vault context is needed for the current development task
- When loading reference material for architecture decisions
- When assembling knowledge for a specific topic
- When multi-document context is needed (use `/maencof-lens:lookup` for single-doc summary)

## Prerequisites

- `.maencof-lens/config.json` must exist in project root
- Vault index must be built
- If no config: "No lens config found. Run `/maencof-lens:setup-lens` to configure."

## Workflow

### Step 1 — Query & Budget Extraction

Extract query and budget from user input.

- Natural-language query → search keywords
- Budget detection: `--budget <N>` (default 2000)
- Vault filter: `--vault <name>` (default vault)
- Layer filter: `--layer <N>` (vault config upper bound)

### Step 2 — Call lens_context

Call the `lens_context` MCP tool to run SA search and assemble a token-budgeted context block in one call.

```
lens_context(query: user_query, token_budget: budget, vault?: specified_vault, layer_filter?: specified_layers)
```

NOTE: `lens_context` internally runs its own Spreading Activation query via `handleKgContext`.
A separate `lens_search` call is NOT needed — it would be redundant.

If no results: "관련 문서를 찾지 못했습니다. 다른 쿼리를 시도하세요."

### Step 3 — Result Formatting

Format and present structured context block with source list and token usage.

```markdown
## Context: "{query}" (budget: {N} tokens)

{assembled context block}

---
Sources: {N} documents from vault "{vault_name}"
Token usage: ~{used}/{budget}
```

## MCP Tools

| Tool | Purpose |
|------|---------|
| `lens_context` | SA 검색 + 토큰 예산 기반 컨텍스트 조립 (내부적으로 검색 수행) |

## Options

```
/maencof-lens:context <query> [--budget <N>] [--vault <name>] [--layer <N>]
```

| Option | Default | Description |
|--------|---------|-------------|
| `query` | required | 컨텍스트 조립 쿼리 (자연어) |
| `--budget` | 2000 | 토큰 예산 |
| `--vault` | default vault | 대상 vault |
| `--layer` | vault config | Layer 필터 (vault 상한 내) |

## Usage Examples

```
/maencof-lens:context FCA architecture patterns
/maencof-lens:context NER model optimization --budget 4000
/maencof-lens:context project goals --vault work
/maencof-lens:context design decisions --layer 2 --budget 3000
```

## Error Handling

- **No lens config**: guide to `/maencof-lens:setup-lens`
- **No index**: guide to run `kg_build` in maencof session
- **No results**: suggest different query or broader keywords
- **Token budget exceeded**: show truncation notice with count
