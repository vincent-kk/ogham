---
name: organize
user-invocable: false
description: 'Consolidates accumulated insights into current accounts, maintains document content, or reviews layer transitions. Use for insight distillation, memory organization, and L5 buffer triage.'
argument-hint: '[--insights [--path PREFIX] [--apply|--dry-run]] [--maintenance] [--dry-run] [--layer 3|4|5] [--min-confidence 0.0-1.0]'
version: '1.0.0'
complexity: complex
context_layers: [1, 2, 3, 4, 5]
orchestrator: memory-organizer
plugin: maencof
---

# organize — Knowledge Transition Orchestration

Runs the memory-organizer agent to recommend and execute document transitions between Layers. The judge module evaluates candidates, then the execute module performs the actual move after user confirmation.

## Insight Mode

For `--insights`, load Assess, Apply and Relations in [insight-lifecycle.md](../.shared/insight-lifecycle.md) and the shared maintenance procedure below. This mode replaces the default transition workflow, including its index prerequisite and error handling: inventory can preview disk documents without an index. The active agent owns assessment and authorized writes, and may use memory-organizer for bounded assessment within its existing access matrix.

`organize --insights [--path VAULT_RELATIVE_PREFIX] [--apply | --dry-run]` defaults to read-only preview. `--apply` consumes the reviewed plan within existing authorization; `--apply --dry-run` is invalid. `--maintenance` is redundant but allowed once; `--layer` and `--min-confidence` cannot be mixed with this mode. `--path` and `--apply` require `--insights`.

Use complete `mcp__plugin_maencof_tools__kg_inventory` pagination and full `mcp__plugin_maencof_tools__read` bodies, including unchanged/held/error candidates in the report. Use `mcp__plugin_maencof_tools__kg_search` only to find related current accounts. Preview exact source and target writes, preserve originals, verify the target before marking sources, and stop on failure or drift. Only validated knowledge may form an L2 synthesis; hold unvalidated L5 groups. Execute through `mcp__plugin_maencof_tools__create` and `mcp__plugin_maencof_tools__update`, then read back. Source deletion, archival and implicit layer promotion are outside this mode.

## Maintenance Mode

With `--maintenance`, load [document-maintenance.md](../.shared/document-maintenance.md) and review full documents for superseded claims, repetition and independent topics. Present a rewrite/split plan with source preservation and size measurements; apply the authorized scope without repeating approval. Use the active agent for child creation and verification. The memory-organizer may review or update within its existing access matrix; this mode grants no new L1/create/bulk permissions. Keep the complete original until every child is created and verified, then retain its path as a linked overview. Reruns reuse verified children. Default invocation retains the layer-transition workflow below. Same-layer directory classification belongs to `/maencof:classify`.

## When to Use This Skill

- When you want to clean up internalization candidates from Layer 3/4 documents
- When you want to promote frequently accessed external references to Layer 2
- When you want to clean up expired Layer 4 documents
- "memory organization", "knowledge organization", "document move"

## When to Use vs Adjacent Skills

- **`organize`** — judge + execute. Mutates the vault via `mcp__plugin_maencof_tools__move` after explicit user confirmation. Use when you are ready to apply transitions.
- **`reflect`** — read-only vault assessment. Produces an analysis report and may retain review snapshots outside the vault. Use to preview candidates before committing. Rule of thumb: preview → `reflect`; apply layer changes → `organize`; propose new links → call `mcp__plugin_maencof_tools__kg_suggest_links`.

## Agent Collaboration Sequence

```
[organize skill] -> [memory-organizer.judge] -> transition candidate list
                                             |
                                   user confirmation (AutonomyLevel 1)
                                             |
              -> [memory-organizer.execute] -> move execution
```

> **Note.** Stale-node bookkeeping is handled inside the MCP server middleware layer (around `mcp__plugin_maencof_tools__move` / `mcp__plugin_maencof_tools__update` calls and at boot-time via vault scanning). It never interacts with the organize workflow directly.

**Orchestrator**: the organize skill coordinates the entire flow. Calls the memory-organizer agent sequentially through judge -> (confirmation) -> execute stages.

## Workflow

### Step 1 — Pre-check Index Status

Check vault status and stale nodes with the `mcp__plugin_maencof_tools__kg_status` MCP tool before delegating to the agent. If no index is found, abort with: "No index found. Please run `/maencof:build` first."

### Step 2 — judge stage (memory-organizer delegation)

Run the judge module of the `memory-organizer` agent:

- Scan Layer 3/4/5 files (including Layer 3 sub-layer directories: `relational/`, `structural/`, `topical/`)
- Evaluate access frequency, tag matching, and connection density
- Generate a list of TransitionDirectives
- **Layer 5 promotion**: Identify L5 documents that have been categorized (have tags, connections) and recommend promotion to L2/L3 with the appropriate sub-layer, following their `promotion_target` when set

### Step 3 — Display Candidates and User Confirmation

Display the generated TransitionDirectives in table format:

```
| File | Current Layer | Target Layer | Reason | Confidence |
```

The user can type "proceed" or select/exclude individual items.

### Step 4 — execute stage (memory-organizer delegation)

Run the execute module for approved TransitionDirectives:

- Call `mcp__plugin_maencof_tools__move` (with `target_sub_layer` when moving to L3 or L5 sub-directories)
- Update the Frontmatter `layer` and `sub_layer` fields
- Update link paths
- **L5 field auto-strip**: When moving out of Layer 5, `mcp__plugin_maencof_tools__move` automatically strips `buffer_type` · `promotion_target` · `source_context`

### Step 5 — Result Summary

Output the list of executed transitions and an AgentExecutionResult summary.

## Available MCP Tools

> For default layer transitions, memory-organizer invokes the mutation tools. Insight and maintenance modes use the active agent for creation and verification as described above; no specialist gains new write permissions.

| Tool                                     | Used by                                 | Purpose                            |
| ---------------------------------------- | --------------------------------------- | ---------------------------------- |
| `mcp__plugin_maencof_tools__kg_status`   | skill (Step 1)                          | Check vault status and stale-nodes |
| `mcp__plugin_maencof_tools__read`        | active agent or memory-organizer | Read full bodies and metadata; verify changes |
| `mcp__plugin_maencof_tools__kg_navigate` | memory-organizer agent                  | Traverse link relationships        |
| `mcp__plugin_maencof_tools__move`        | memory-organizer agent (execute module) | Execute file move                  |
| `mcp__plugin_maencof_tools__update`      | active agent or memory-organizer within its access matrix | Update content and Frontmatter |
| `mcp__plugin_maencof_tools__kg_inventory` | active agent (insight mode) | Enumerate all scoped candidates |
| `mcp__plugin_maencof_tools__kg_search` | active agent (insight mode) | Locate related current accounts |
| `mcp__plugin_maencof_tools__create` | active agent (insight or maintenance mode) | Create reviewed knowledge documents |

## Error Handling

- **No index**: "No index found. Please run `/maencof:build` first."
- **memory-organizer unavailable**: abort and guide to retry
- **move failure**: skip the failed item, report it, and continue with remaining transitions
- **User cancels confirmation**: abort execute stage; no filesystem changes made
- **No transition candidates found**: "No transition candidates found at the current confidence threshold. Try `--min-confidence 0.5` to lower the threshold."

### Auto-Insight Documents

When organizing, prioritize reviewing documents with the `auto-insight` tag:

- L5 auto-insight documents with strong connections (high link count) → promote to L2
- L5 auto-insight documents with no connections after 30+ days → archive candidate
- Update `.maencof-meta/auto-insight-stats.json` when promoting (increment `l5_promoted`) or archiving (increment `l5_archived`)

### Layer 5 Promotion Workflow

Buffer documents are temporary holding areas. During organization:

1. **Scan** `05_Context/` for documents older than 7 days
2. **Evaluate** each document's connections, tags, and content type
3. **Recommend target**: L2 (internalized), L3 with sub-layer (external reference), or archive
4. **Execute** via `mcp__plugin_maencof_tools__move` with `target_sub_layer` — buffer metadata is auto-stripped. Pass `target_subdirectory` (e.g. `"projects"`, max 2 levels) to file the promoted document into a subdirectory of the target layer/sub-layer.

## Options

```
/maencof:organize [--dry-run] [--layer <3|4|5>] [--min-confidence <0.0-1.0>]
```

| Option             | Default | Description                                                                                                                   |
| ------------------ | ------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `--dry-run`        | false   | Run judge only, skip execute stage. Plain TransitionDirective preview; use `/maencof:reflect` for a deeper diagnostic report. |
| `--layer`          | 3,4,5   | Target Layer(s) to scan (3, 4, or 5)                                                                                          |
| `--min-confidence` | 0.7     | Minimum confidence threshold                                                                                                  |
