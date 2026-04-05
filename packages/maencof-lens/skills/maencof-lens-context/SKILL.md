---
name: maencof-lens-context
user_invocable: true
description: "[maencof-lens:maencof-lens-context] Token-budgeted multi-document context assembly from vault via Spreading Activation. Assembles relevant vault documents within a specified token budget for development context injection. Use for broad knowledge loading across multiple documents when working on tasks that require vault reference material — architecture decisions, topic research, or background context gathering."
version: 1.1.0
complexity: simple
plugin: maencof-lens
---

# maencof-lens-context — Vault Context Assembly

Assemble a token-budgeted context block from vault documents matching a query.
For single-doc quick reference, use `/maencof-lens:maencof-lens-lookup` instead.

## When to Use

- Multi-document vault context needed for a development task
- Loading reference material for architecture decisions or topic research
- Assembling background knowledge as a structured context block
- **Not** for single-doc lookup — use `/maencof-lens:maencof-lens-lookup`

## Prerequisites

- `.maencof-lens/config.json` required — if missing: "Run `/maencof-lens:maencof-lens-setup`"
- Vault index required (`.maencof/index.json`) — if missing: "Run `kg_build` in a maencof session"

## Workflow

### Step 1 — Parse Input

Extract query and options from user input:

- Natural-language query → search keywords
- `--budget <N>` → token budget (default: 2000)
- `--vault <name>` → target vault (default: config default)
- `--layer <N>` → layer filter ceiling (default: vault config)
- `--full` → include full document text instead of snippets

### Step 2 — Call lens_context (single tool call)

```
lens_context(query: user_query, token_budget: budget, vault?: name, layer_filter?: layers, include_full?: bool)
```

`lens_context` internally runs SA search + context assembly via `handleKgContext`.
Do NOT call `lens_search` separately — it is redundant.

No results → suggest different query or broader keywords.

### Step 3 — Present Result

```markdown
## Context: "{query}" (budget: {N} tokens)

{assembled context block}

---
Sources: {N} documents from vault "{vault_name}"
Token usage: ~{used}/{budget}
```

If token budget exceeded, show truncation notice with actual vs. budget count.

## MCP Tools

| Tool | Purpose |
|------|---------|
| `lens_context` | SA search + token-budgeted context assembly (internally performs search) |

## Options

```
/maencof-lens:maencof-lens-context <query> [--budget <N>] [--vault <name>] [--layer <N,N,...>] [--full]
```

| Option | Default | Description |
|--------|---------|-------------|
| `query` | required | Context assembly query (natural language) |
| `--budget` | 2000 | Token budget for assembled output |
| `--vault` | default vault | Target vault name |
| `--layer` | vault config | Layer filter as comma-separated list (e.g., `2,3,4`). Intersected with vault config ceiling — only layers present in both are used. |
| `--full` | false | Include full document text instead of snippets |

## Usage Examples

```
/maencof-lens:maencof-lens-context FCA architecture patterns
/maencof-lens:maencof-lens-context NER model optimization --budget 4000
/maencof-lens:maencof-lens-context project goals --vault work
/maencof-lens:maencof-lens-context design decisions --layer 2 --budget 3000
/maencof-lens:maencof-lens-context deployment strategy --full
```

## Error Handling

- **No lens config** → guide to `/maencof-lens:maencof-lens-setup`
- **No index** → guide to run `kg_build` in maencof session
- **No results** → suggest different query or broader keywords
- **Token budget exceeded** → show truncation notice with used/budget count
