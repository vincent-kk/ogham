---
name: remember
user-invocable: false
description: 'Records a concept, insight, or reference into the vault: recommends a layer, extracts tags, deduplicates, and creates a structured document. Use when the user says remember this, save this, 기억해줘, or 기록해.'
argument-hint: '[content] [--layer 2-5] [--tags TAGS] [--title TITLE]'
version: '1.0.0'
complexity: medium
context_layers: [2, 3, 4, 5]
orchestrator: remember skill
plugin: maencof
---

# remember — Record New Knowledge

Extracts knowledge from the current conversation or user input and saves it as a markdown document in the appropriate Layer. Performs automatic Layer recommendation, tag extraction, and pre-creation duplicate document checking.

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

Identify the explicit content to record; if it is unclear, ask what the user wants recorded.

### Step 2 — Determine Layer

Recommend a Layer based on the nature of the content:

| Layer       | Criteria                                            | Directory      |
| ----------- | --------------------------------------------------- | -------------- |
| L2 Derived  | Internalized skills/knowledge/insights              | `02_Derived/`  |
| L3 External | External references, links, temporary knowledge     | `03_External/` |
| L4 Action   | To-dos, current session context, temporary notes    | `04_Action/`   |
| L5 Context  | Unclassified fragments awaiting triage (flat inbox) | `05_Context/`  |

**L2 recommendation criteria**: knowledge the user has directly acquired, validated concepts, expected to be referenced repeatedly **L3 recommendation criteria**: contains URL, references external materials, has explicit `source:` **L4 recommendation criteria**: "later", "today", "need to", time-limited, has an expiration date **L5 fallback rule**: when none of the L2/L3/L4 criteria clearly applies — the fragment is uncategorized, its context is unclear, or classification confidence is low — do NOT force a layer. Save it to Layer 5 (`05_Context/`), the flat inbox for later triage. L5 items are promoted or expired via `/maencof:organize` and `/maencof:cleanup buffer`.

#### L3 Sub-Layer Selection

`sub_layer` applies only to L3. For every other layer, omit it entirely — passing it will be rejected by `mcp__plugin_maencof_tools__create` because **sub_layer is only valid for Layer 3**.

When creating an L3 document, determine the appropriate sub-layer:

| Sub-Layer      | Criteria                                   | Directory                 |
| -------------- | ------------------------------------------ | ------------------------- |
| L3A Relational | People, relationships, social context      | `03_External/relational/` |
| L3B Structural | Organizations, teams, systems, processes   | `03_External/structural/` |
| L3C Topical    | Concepts, technologies, external knowledge | `03_External/topical/`    |

Pass `sub_layer` to `mcp__plugin_maencof_tools__create`. If the content doesn't clearly fit a sub-layer, default to **topical** (`03_External/topical/`). This aligns with the L3 Classification Rules used by `/maencof:migrate`.

#### Layer 5 and Cross-Layer Hubs

Layer 5 is the flat unclassified inbox at `05_Context/` — it has no sub-layers. Set `buffer_type` (`snippet` / `conversation` / `unclassified`) and, when known, `promotion_target` and `source_context`.

**Cross-layer hubs are not a layer.** A project MOC or cross-domain hub is any L1–L4 document carrying `hub: true` with `hub_kind` and `purpose`. Create it with `create` at whatever layer the knowledge belongs to — a study hub over external topics is L3-structural, a project MOC is L4. Layer 5 documents cannot be hubs.

If the user specifies `--layer`, use that Layer. Otherwise, confirm the recommended Layer with the user before proceeding.

### Step 3 — Tag Extraction

Extract 3–5 relevant lowercase English tags, using hyphens for multiword tags.

### Step 4 — Pre-creation Duplicate Check

Search for similar documents with `mcp__plugin_maencof_tools__kg_search` to prevent duplicates:

```
mcp__plugin_maencof_tools__kg_search(
  seed: [1-2 core tags],
  max_results: 3,
  threshold: 0.3
)
```

If a similar document is found, require the user to choose **Create new**, **Update existing**, or **Cancel** before proceeding.

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

`confidence` (internalization 0.0-1.0, initial ~0.3) is not a create parameter — set it after creation via `mcp__plugin_maencof_tools__update` (frontmatter). Sub-layer scalar metadata (L3A `person_ref`/`trust_level`/`expertise_domains`, L3B `org_type`/`membership_status`/`ba_context`, L3C `topic_category`/`maturity`) is likewise settable only through post-create `update`. The nested L3A `person` object still has no MCP write path — do not promise it during remember.

**L4 Frontmatter**:

```yaml
layer: 4
tags: [extracted tags]
expires: YYYY-MM-DD # expiration date (if applicable)
schedule: 'once' # or "daily", "weekly"
```

**L5 Frontmatter** (flat unclassified inbox — no sub-layer):

```yaml
layer: 5
buffer_type: snippet # snippet | conversation | unclassified
promotion_target: topical # optional: relational | structural | topical | L2
source_context: '대화 중 멘션' # optional: where this came from
tags: [extracted tags]
expires: YYYY-MM-DD # optional; L5 items default to a ~30-day triage window
```

**Hub Frontmatter** (any L1–L4 document, added to its normal frontmatter):

```yaml
hub: true
hub_kind: project_moc # project_moc | cross_domain | synthesis | study_hub
purpose: 'what this hub integrates, in one line' # required when hub: true
```

### Step 6 — Confirmation Report

Report to the user after successful creation:

```
Recorded: {title}
Path: {path}
Layer: {layer_name}
Tags: {tags}

To explore related documents, use the `explore` skill with `{tag}`.
```

## Available MCP Tools

| Tool                                   | Purpose                                               |
| -------------------------------------- | ----------------------------------------------------- |
| `mcp__plugin_maencof_tools__create`    | Create document (primary tool)                        |
| `mcp__plugin_maencof_tools__kg_search` | Pre-creation duplicate check                          |
| `mcp__plugin_maencof_tools__update`    | Update existing document (when duplicate found)       |
| `mcp__plugin_maencof_tools__read`      | Read existing document content (when duplicate found) |

## Options

> Options are interpreted by the LLM in natural language.

```
/maencof:remember [content] [--layer <2-5>] [--sub-layer <name>] [--title <title>] [--tags <tag1,tag2>] [--source <url>] [--expires <YYYY-MM-DD>] [--filename <[subdir/]name>]
```

| Option        | Default              | Description                                                                                                                             |
| ------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `content`     | conversation context | Content to record                                                                                                                       |
| `--layer`     | auto-recommended     | Specify Layer (2-5; L1 not allowed)                                                                                                     |
| `--sub-layer` | auto-recommended     | Sub-layer: relational/structural/topical (L3 only; L5 is flat)                                                                          |
| `--title`     | auto-generated       | Document title                                                                                                                          |
| `--tags`      | auto-extracted       | Tag list (comma-separated)                                                                                                              |
| `--source`    | none                 | External source URL (for L3)                                                                                                            |
| `--expires`   | none                 | Expiration date YYYY-MM-DD (for L4 / L5)                                                                                                |
| `--filename`  | auto-generated       | Filename hint; a subdirectory prefix groups related documents, e.g. `projects/alpha-kickoff` (max 2 levels; L1/L5 are flat — no prefix) |
| `--no-check`  | false                | Skip duplicate check                                                                                                                    |

## Error Handling

- **Attempt to create L1**: "Layer 1 can only be created via `/maencof:setup`."
- **Duplicate filename**: automatically append a timestamp suffix
- **Tags not extracted**: ask user to enter them directly
- **No index**: skip kg_search and proceed directly to creation
