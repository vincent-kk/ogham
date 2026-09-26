---
name: ingest
user-invocable: true
description: 'Imports GitHub issues, Slack messages, or web pages into the vault as Layer 3, 4, or 5 documents with frontmatter, tags, and link suggestions. Use when saving external content or references into maencof.'
argument-hint: '[source] [--layer 3|4|5] [--tags TAGS] [--path PATH]'
version: '1.0.0'
complexity: medium
context_layers: [3, 4, 5]
orchestrator: ingest skill
plugin: maencof
---

# ingest — External Knowledge Ingestion



Fetches content from external data sources (GitHub issues, Slack messages, web pages, etc.) and converts it into maencof documents (Layer 3, 4, or 5) for storage.

## When to Use This Skill

Load [document-maintenance.md](../.shared/document-maintenance.md) before writing or summarizing vault knowledge. Read full existing documents, integrate corrections in place, preserve source links with verified locations, and choose topic directories independently of tags. Handle size warnings with rewriting or semantic splitting; search snippets alone do not establish a claim.

- When you want to record a GitHub issue or PR in the knowledge vault
- When you want to save external reference materials as Layer 3
- When you want to quickly record temporary work notes as Layer 4
- "ingest", "import", "save external data"

## Workflow

### Step 1 — Source Parsing

Identify the data source type and content from input:

- GitHub URL -> use the GitHub MCP server if installed; otherwise fall back to `WebFetch`, or guide the user to `/maencof:mcp-setup`
- Other URL -> fetch the web page with `WebFetch`
- Direct text input (e.g. a pasted Slack message) -> use as-is

### Step 2 — Layer Determination

| Source Type                                         | Default Layer    | Reason                 |
| --------------------------------------------------- | ---------------- | ---------------------- |
| External reference (URL, document)                  | Layer 3          | External origin        |
| Temporary work note                                 | Layer 4          | Volatile               |
| GitHub issue (in progress)                          | Layer 4          | Temporal proximity     |
| Completed issue/PR                                  | Layer 3          | For reference          |
| Unclassified fragments, scraps with unclear context | Layer 5 (buffer) | Inbox for later triage |

### Step 3 — Auto-generate Frontmatter

Determine the Frontmatter fields to pass to `mcp__maencof__create`. The `created` and `updated` timestamps are set automatically by `mcp__maencof__create` and do not need to be specified manually.

```yaml
tags: [auto-extracted tags]
layer: 3, 4, or 5
source: { original URL }
```

Tags are auto-extracted as core keywords from the content.

### Step 4 — Call `mcp__maencof__create`

Before creating, search for an existing account of the same subject and read its complete body. Integrate repeated or updated source information through `update` when it belongs there, preserving each claim's source and location; skip creation in that case. For a distinct document, choose a topic directory from its title/gist/body and existing folder purpose, independently of tags. Use that prefix in filename within L2/L3/L4's two-level budget; L5 stays flat. Treat timestamps as chronology only, not as a collision workaround.

```
mcp__maencof__create({
  layer: 3, 4, or 5,
  sub_layer: "topical" (L3 only; relational/structural if it fits),  // omit for L1/L2/L4/L5
  tags: [auto-extracted tags],
  content: {converted markdown},
  title: {title},
  filename: "date-title" (for Layer 4 temporary notes; a subdirectory prefix like "geeknews/2026-07-04-title" groups related items, max 2 levels),
  source: {original URL} (for Layer 3 external references),
  expires: "YYYY-MM-DD" (for Layer 4 expiring items)
})
```

### Step 5 — Connection Suggestions

Search for existing documents related to the created document via `mcp__maencof__kg_search` and suggest adding links.

## Available Tools

| Tool                                   | Type   | Purpose                         |
| -------------------------------------- | ------ | ------------------------------- |
| `mcp__maencof__create`    | MCP    | Create document                 |
| `mcp__maencof__kg_search` | MCP    | Search for related documents    |
| `mcp__maencof__update`    | MCP    | Add links                       |
| `WebFetch`                             | Native | Fetch web page content from URL |

## Error Handling

- **maencof not initialized**: "Please run `/maencof:setup` first."
- **URL fetch failure**: report error and offer to save the URL as an L3 stub document with the source field set
- **GitHub URL but no GitHub MCP**: guide to run `/maencof:mcp-setup` to install the GitHub MCP server
- **`mcp__maencof__create` failure**: report error; no partial document created
- **Duplicate detected via kg_search**: ask whether to `mcp__maencof__create` new or `mcp__maencof__update` existing document

## Options

```
/maencof:ingest [source] [--layer <3|4|5>] [--tags <tags>] [--path <path>]
```

| Option    | Default         | Description           |
| --------- | --------------- | --------------------- |
| `source`  | required        | URL or text           |
| `--layer` | auto-determined | Specify storage Layer |
| `--tags`  | auto-extracted  | Additional tags       |
| `--path`  | auto-generated  | Specify storage path  |
