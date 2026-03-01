---
name: remember
user_invocable: true
description: Record new knowledge to the maencof knowledge tree — automatic Layer recommendation + tag extraction + duplicate check
version: 1.0.0
complexity: medium
context_layers: [2, 3, 4, 5]
orchestrator: remember skill
plugin: maencof
---

# remember — Record New Knowledge

Extracts knowledge from the current conversation or user input and saves it as a markdown document in the appropriate Layer.
Performs automatic Layer recommendation, tag extraction, and pre-creation duplicate document checking.

## When to Use This Skill

- When you want to record a new concept, skill, or insight
- When adding external references (documents, links, frameworks) to the knowledge tree
- When saving current session work context or to-dos as Layer 4
- When you want to permanently record important conclusions from a conversation

## Prerequisites

- The maencof vault must be initialized (Layer directories must exist)
- L1 documents can only be created via `/maencof:setup` — not via remember.

## Workflow

### Step 1 — Identify What to Record

Identify the content to record from user input or current conversation context:

- Explicit content: `"remember X"`, `"save Y"`
- Implicit content: detect important conclusions or insights from the conversation
- If content is unclear: ask "What would you like to record?"

### Step 2 — Determine Layer

Recommend a Layer based on the nature of the content:

| Layer | Criteria | Directory |
|-------|----------|-----------|
| L2 Derived | Internalized skills/knowledge/insights | `02_Derived/` |
| L3 External | External references, links, temporary knowledge | `03_External/` |
| L4 Action | To-dos, current session context, temporary notes | `04_Action/` |
| L5 Context | Environmental context, domain metadata, people profiles | `05_Context/` |

**L2 recommendation criteria**: knowledge the user has directly acquired, validated concepts, expected to be referenced repeatedly
**L3 recommendation criteria**: contains URL, references external materials, has explicit `source:`
**L4 recommendation criteria**: "later", "today", "need to", time-limited, has an expiration date

If the user specifies `--layer`, use that Layer.
Confirm the recommended Layer with the user before proceeding:
```
"I'll save this to Layer {N} ({name}). Is that correct? (y/n or a different Layer number)"
```

### Step 3 — Tag Extraction

Extract 3–5 relevant tags from the content. Rules:

- Core concept/technology names (e.g., `react`, `typescript`, `knowledge-graph`)
- Domain (e.g., `frontend`, `ai`, `personal-productivity`)
- Document type (e.g., `tutorial`, `reference`, `insight`)
- Lowercase English or use hyphens (-)

### Step 4 — Pre-creation Duplicate Check

Search for similar documents with `kg_search` to prevent duplicates:

```
kg_search(
  seed: [1-2 core tags],
  max_results: 3,
  threshold: 0.3
)
```

If a similar document is found:
```
"A similar document exists:
  - {title} ({path})

Would you like to create a new document or update the existing one? (Create new / Update / Cancel)"
```

### Step 5 — Document Creation

Create the document with the `maencof_create` MCP tool:

**L2 Frontmatter**:
```yaml
layer: 2
tags: [extracted tags]
title: auto-generated or user-provided
```

**L3 Frontmatter** (fields written into the document by `maencof_create`):
```yaml
layer: 3
tags: [extracted tags]
source: "original source URL (if available)"
confidence: 0.3  # document-level metadata, not a maencof_create parameter; initial value, increases after validation
```

**L4 Frontmatter**:
```yaml
layer: 4
tags: [extracted tags]
expires: YYYY-MM-DD  # expiration date (if applicable)
schedule: "once"     # or "daily", "weekly"
```

**L5 Frontmatter**:
```yaml
layer: 5
tags: [extracted tags]
domain: "domain or context category"
subject: "person name or entity (if applicable)"
```

### Step 6 — Confirmation Report

Report to the user after successful creation:

```
Recorded: {title}
Path: {path}
Layer: {layer_name}
Tags: {tags}

To explore related documents: /maencof:explore {tag}
```

## Available MCP Tools

| Tool | Purpose |
|------|---------|
| `maencof_create` | Create document (primary tool) |
| `kg_search` | Pre-creation duplicate check |
| `maencof_update` | Update existing document (when duplicate found) |
| `maencof_read` | Read existing document content (when duplicate found) |

## Options

> Options are interpreted by the LLM in natural language.

```
/maencof:remember [content] [--layer <2-5>] [--title <title>] [--tags <tag1,tag2>] [--source <url>] [--expires <YYYY-MM-DD>]
```

| Option | Default | Description |
|--------|---------|-------------|
| `content` | conversation context | Content to record |
| `--layer` | auto-recommended | Specify Layer (2-5; L1 not allowed) |
| `--title` | auto-generated | Document title |
| `--tags` | auto-extracted | Tag list (comma-separated) |
| `--source` | none | External source URL (for L3) |
| `--expires` | none | Expiration date YYYY-MM-DD (for L4) |
| `--no-check` | false | Skip duplicate check |

## Usage Examples

```
/maencof:remember If you leave the dependency array empty in a React hook, it only runs once on mount
/maencof:remember https://example.com/paper paper on spreading activation --layer 3
/maencof:remember PR review due tomorrow --layer 4 --expires 2024-12-31
/maencof:remember --title "TypeScript Generic Patterns" --tags typescript,generic,pattern
```

## Error Handling

- **Attempt to create L1**: "Layer 1 can only be created via `/maencof:setup`."
- **Duplicate filename**: automatically append a timestamp suffix
- **Tags not extracted**: ask user to enter them directly
- **No index**: skip kg_search and proceed directly to creation
