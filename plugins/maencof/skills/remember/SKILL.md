---
name: remember
user_invocable: true
description: '[maencof:remember] Records a concept, insight, or reference into the vault by recommending the right layer, extracting tags, deduplicating, and saving a properly structured markdown document with frontmatter.'
argument-hint: '[content] [--layer 2-5] [--sub-layer NAME] [--title TITLE] [--tags TAGS] [--source URL] [--expires DATE] [--filename NAME] [--no-check]'
version: '1.0.0'
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

| Layer       | Criteria                                                               | Directory      |
| ----------- | ---------------------------------------------------------------------- | -------------- |
| L2 Derived  | Internalized skills/knowledge/insights                                 | `02_Derived/`  |
| L3 External | External references, links, temporary knowledge                        | `03_External/` |
| L4 Action   | To-dos, current session context, temporary notes                       | `04_Action/`   |
| L5 Context  | Unclassified fragments (buffer inbox), cross-layer MOC/hubs (boundary) | `05_Context/`  |

**L2 recommendation criteria**: knowledge the user has directly acquired, validated concepts, expected to be referenced repeatedly
**L3 recommendation criteria**: contains URL, references external materials, has explicit `source:`
**L4 recommendation criteria**: "later", "today", "need to", time-limited, has an expiration date
**L5 fallback rule**: when none of the L2/L3/L4 criteria clearly applies — the fragment is uncategorized, its context is unclear, or classification confidence is low — do NOT force a layer. Save it to L5 buffer (`05_Context/buffer/`), the inbox for later triage. Buffer items are promoted or expired via `/maencof:organize` and `/maencof:cleanup buffer`.

#### L3 Sub-Layer Selection

`sub_layer` applies only to L3 and L5. For L1/L2/L4, omit `sub_layer` entirely — passing it on those layers will be rejected by `mcp__plugin_maencof_tools__create` because **sub_layer is only valid for L3 or L5**.

When creating an L3 document, determine the appropriate sub-layer:

| Sub-Layer      | Criteria                                   | Directory                 |
| -------------- | ------------------------------------------ | ------------------------- |
| L3A Relational | People, relationships, social context      | `03_External/relational/` |
| L3B Structural | Organizations, teams, systems, processes   | `03_External/structural/` |
| L3C Topical    | Concepts, technologies, external knowledge | `03_External/topical/`    |

Pass `sub_layer` to `mcp__plugin_maencof_tools__create`. If the content doesn't clearly fit a sub-layer, default to **topical** (`03_External/topical/`). This aligns with the L3 Classification Rules used by `/maencof:migrate`.

#### L5 Sub-Layer Selection

When creating an L5 document, determine the role:

| Sub-Layer   | Criteria                             | Directory              |
| ----------- | ------------------------------------ | ---------------------- |
| L5-Buffer   | Uncategorized temporary items, inbox | `05_Context/buffer/`   |
| L5-Boundary | Cross-layer bridge, project MOC, hub | `05_Context/boundary/` |

Default to **Buffer** for general L5 content. For **Boundary** documents (project MOC, cross-layer hub linking e.g. L1 values to L3 references), do NOT use `create` — use the dedicated `mcp__plugin_maencof_tools__boundary_create` tool, which writes the required `boundary_type` / `connected_layers` frontmatter that `create` cannot set.

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

Search for similar documents with `mcp__plugin_maencof_tools__kg_search` to prevent duplicates:

```
mcp__plugin_maencof_tools__kg_search(
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

Create the document with the `mcp__plugin_maencof_tools__create` MCP tool:

**L2 Frontmatter**:

```yaml
layer: 2
tags: [extracted tags]
title: auto-generated or user-provided
```

**L3 Frontmatter** (fields written into the document by `mcp__plugin_maencof_tools__create`):

```yaml
layer: 3
sub_layer: relational | structural | topical # defaults to topical if unclear
tags: [extracted tags]
source: 'original source URL (if available)'
```

`confidence` (internalization 0.0-1.0, initial ~0.3) is not a create parameter — set it
after creation via `mcp__plugin_maencof_tools__update` (frontmatter). Rich sub-layer metadata
(L3A `person`, L3B `org_type`, etc.) is schema-validated on read but has no MCP write
path — do not promise those fields during remember.

**L4 Frontmatter**:

```yaml
layer: 4
tags: [extracted tags]
expires: YYYY-MM-DD # expiration date (if applicable)
schedule: 'once' # or "daily", "weekly"
```

**L5 Frontmatter** (buffer — the only L5 kind written via `create`):

```yaml
layer: 5
sub_layer: buffer # default for L5
tags: [extracted tags]
expires: YYYY-MM-DD # optional; buffer items default to a ~30-day triage window
```

L5-Boundary documents are created with `mcp__plugin_maencof_tools__boundary_create`
(`title`, `boundary_type: project_moc|cross_domain|synthesis`, `connected_layers`, `tags`) —
not with `create`.

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

| Tool                                         | Purpose                                               |
| -------------------------------------------- | ----------------------------------------------------- |
| `mcp__plugin_maencof_tools__create`          | Create document (primary tool)                        |
| `mcp__plugin_maencof_tools__boundary_create` | Create L5 boundary (MOC/hub) documents                |
| `mcp__plugin_maencof_tools__kg_search`       | Pre-creation duplicate check                          |
| `mcp__plugin_maencof_tools__update`          | Update existing document (when duplicate found)       |
| `mcp__plugin_maencof_tools__read`            | Read existing document content (when duplicate found) |

## Options

> Options are interpreted by the LLM in natural language.

```
/maencof:remember [content] [--layer <2-5>] [--sub-layer <name>] [--title <title>] [--tags <tag1,tag2>] [--source <url>] [--expires <YYYY-MM-DD>] [--filename <[subdir/]name>]
```

| Option        | Default              | Description                                                                                                 |
| ------------- | -------------------- | ----------------------------------------------------------------------------------------------------------- |
| `content`     | conversation context | Content to record                                                                                           |
| `--layer`     | auto-recommended     | Specify Layer (2-5; L1 not allowed)                                                                         |
| `--sub-layer` | auto-recommended     | Sub-layer: relational/structural/topical (L3), buffer/boundary (L5)                                         |
| `--title`     | auto-generated       | Document title                                                                                              |
| `--tags`      | auto-extracted       | Tag list (comma-separated)                                                                                  |
| `--source`    | none                 | External source URL (for L3)                                                                                |
| `--expires`   | none                 | Expiration date YYYY-MM-DD (for L4 / L5 buffer)                                                             |
| `--filename`  | auto-generated       | Filename hint; a subdirectory prefix groups related documents, e.g. `projects/alpha-kickoff` (max 2 levels) |
| `--no-check`  | false                | Skip duplicate check                                                                                        |

## Usage Examples

```
/maencof:remember If you leave the dependency array empty in a React hook, it only runs once on mount
/maencof:remember https://example.com/paper paper on spreading activation --layer 3
/maencof:remember PR review due tomorrow --layer 4 --expires 2026-12-31
/maencof:remember --title "TypeScript Generic Patterns" --tags typescript,generic,pattern
/maencof:remember overheard idea — spaced repetition for code review, unsure where it fits --layer 5
/maencof:remember Project Alpha kickoff notes --layer 4 --filename projects/alpha-kickoff
```

## Error Handling

- **Attempt to create L1**: "Layer 1 can only be created via `/maencof:setup`."
- **Duplicate filename**: automatically append a timestamp suffix
- **Tags not extracted**: ask user to enter them directly
- **No index**: skip kg_search and proceed directly to creation
