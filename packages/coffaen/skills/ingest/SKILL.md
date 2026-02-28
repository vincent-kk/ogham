---
name: ingest
user_invocable: true
description: Convert external data sources into coffaen documents (GitHub issues, Slack, etc. -> L3/L4)
version: 1.0.0
complexity: medium
context_layers: [3, 4]
orchestrator: ingest skill
plugin: coffaen
---

# ingest — External Knowledge Ingestion

Fetches content from external data sources (GitHub issues, Slack messages, web pages, etc.)
and converts it into coffaen documents (Layer 3/4) for storage.

## When to Use This Skill

- When you want to record a GitHub issue or PR in the knowledge vault
- When you want to save external reference materials as Layer 3
- When you want to quickly record temporary work notes as Layer 4
- "ingest", "import", "save external data"

## Workflow

### Step 1 — Source Parsing

Identify the data source type and content from input:
- URL -> fetch web page
- GitHub URL -> extract issue/PR content
- Direct text input -> use as-is

### Step 2 — Layer Determination

| Source Type | Default Layer | Reason |
|-------------|--------------|--------|
| External reference (URL, document) | Layer 3 | External origin |
| Temporary work note | Layer 4 | Volatile |
| GitHub issue (in progress) | Layer 4 | Temporal proximity |
| Completed issue/PR | Layer 3 | For reference |

### Step 3 — Auto-generate Frontmatter

```yaml
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: [auto-extracted tags]
layer: 3 or 4
source: {original URL}
```

Tags are auto-extracted as core keywords from the content.

### Step 4 — Call coffaen_create

```
coffaen_create({
  layer: 3 or 4,
  tags: [auto-extracted tags],
  content: {converted markdown},
  title: {title},
  filename: "date-title" (for Layer 4 temporary notes),
  source: {original URL} (for Layer 3 external references),
  expires: "YYYY-MM-DD" (for Layer 4 expiring items)
})
```

### Step 5 — Connection Suggestions

Search for existing documents related to the created document via `kg_search`
and suggest adding links.

## Available MCP Tools

| Tool | Purpose |
|------|---------|
| `coffaen_create` | Create document |
| `kg_search` | Search for related documents |
| `coffaen_update` | Add links |

## Error Handling

- **coffaen not initialized**: "Please run `/coffaen:setup` first."
- **URL fetch failure**: report error and offer to save the URL as an L3 stub document with the source field set
- **GitHub URL but no GitHub MCP**: guide to run `/coffaen:mcp-setup` to install the GitHub MCP server
- **coffaen_create failure**: report error; no partial document created
- **Duplicate detected via kg_search**: ask whether to create new or update existing document

## Options

```
/coffaen:ingest [source] [--layer <3|4>] [--tags <tags>] [--path <path>]
```

| Option | Default | Description |
|--------|---------|-------------|
| `source` | required | URL or text |
| `--layer` | auto-determined | Specify storage Layer |
| `--tags` | auto-extracted | Additional tags |
| `--path` | auto-generated | Specify storage path |
