---
name: maencof-organize
user_invocable: true
description: "[maencof:maencof-organize] Reorganizes the knowledge vault by promoting or retiring documents across layers. Presents ranked recommendations from the memory-organizer agent and executes moves only after explicit confirmation."
argument-hint: "[--dry-run] [--layer 3|4|5] [--min-confidence 0.0-1.0]"
version: "1.0.0"
complexity: complex
context_layers: [1, 2, 3, 4, 5]
orchestrator: memory-organizer
plugin: maencof
---

# maencof-organize — Knowledge Transition Orchestration

Runs the memory-organizer agent to recommend and execute document transitions between Layers.
The judge module evaluates candidates, then the execute module performs the actual move after user confirmation.

## When to Use This Skill

- When you want to clean up internalization candidates from Layer 3/4 documents
- When you want to promote frequently accessed external references to Layer 2
- When you want to clean up expired Layer 4 documents
- "memory organization", "knowledge organization", "document move"

## Agent Collaboration Sequence

```
[organize skill] -> [memory-organizer.judge] -> transition candidate list
                                             |
                                   user confirmation (AutonomyLevel 1)
                                             |
              -> [memory-organizer.execute] -> move execution
                                             |
                               [index-invalidator hook] -> stale-nodes update
```

**Orchestrator**: the organize skill coordinates the entire flow.
Calls the memory-organizer agent sequentially through judge -> (confirmation) -> execute stages.

## Workflow

### Step 1 — Pre-check Index Status

Check vault status and stale nodes with the `mcp_t_kg_status` MCP tool before delegating to the agent.
If no index is found, abort with: "No index found. Please run `/maencof:maencof-build` first."

### Step 2 — judge stage (memory-organizer delegation)

Run the judge module of the `memory-organizer` agent:
- Scan Layer 3/4/5 files (including sub-layer directories: `relational/`, `structural/`, `topical/`, `buffer/`, `boundary/`)
- Evaluate access frequency, tag matching, and connection density
- Generate a list of TransitionDirectives
- **L5-Buffer promotion**: Identify Buffer documents that have been categorized (have tags, connections) and recommend promotion to L2/L3 with appropriate sub-layer

### Step 3 — Display Candidates and User Confirmation

Display the generated TransitionDirectives in table format:

```
| File | Current Layer | Target Layer | Reason | Confidence |
```

The user can type "proceed" or select/exclude individual items.

### Step 4 — execute stage (memory-organizer delegation)

Run the execute module for approved TransitionDirectives:
- Call `mcp_t_move` (with `target_sub_layer` when moving to L3 or L5 sub-directories)
- Update the Frontmatter `layer` and `sub_layer` fields
- Update link paths
- **Buffer auto-strip**: When moving from L5-Buffer to another layer, `mcp_t_move` automatically strips buffer-specific metadata

### Step 5 — Result Summary

Output the list of executed transitions and an AgentExecutionResult summary.

## Available MCP Tools

> The organize skill is an orchestrator. MCP tools are invoked by the memory-organizer agent,
> not directly by this skill. The skill coordinates the workflow and user confirmation flow.

| Tool | Used by | Purpose |
|------|---------|---------|
| `mcp_t_kg_status` | skill (Step 1) | Check vault status and stale-nodes |
| `mcp_t_read` | memory-organizer agent (judge module) | Read document Frontmatter |
| `mcp_t_kg_navigate` | memory-organizer agent | Traverse link relationships |
| `mcp_t_move` | memory-organizer agent (execute module) | Execute file move |
| `mcp_t_update` | memory-organizer agent (execute module) | Update Frontmatter |

## Error Handling

- **No index**: "No index found. Please run `/maencof:maencof-build` first."
- **memory-organizer unavailable**: abort and guide to retry
- **move failure**: skip the failed item, report it, and continue with remaining transitions
- **User cancels confirmation**: abort execute stage; no filesystem changes made
- **No transition candidates found**: "No transition candidates found at the current confidence threshold. Try `--min-confidence 0.5` to lower the threshold."

### Auto-Insight Documents

When organizing, prioritize reviewing documents with the `auto-insight` tag:
- L5 auto-insight documents with strong connections (high link count) → promote to L2
- L5 auto-insight documents with no connections after 30+ days → archive candidate
- Update `.maencof-meta/auto-insight-stats.json` when promoting (increment `l5_promoted`) or archiving (increment `l5_archived`)

### L5-Buffer Promotion Workflow

Buffer documents are temporary holding areas. During organization:
1. **Scan** `05_Context/buffer/` for documents older than 7 days
2. **Evaluate** each document's connections, tags, and content type
3. **Recommend target**: L2 (internalized), L3 with sub-layer (external reference), or archive
4. **Execute** via `mcp_t_move` with `target_sub_layer` — buffer metadata is auto-stripped

## Options

```
/maencof:maencof-organize [--dry-run] [--layer <3|4|5>] [--min-confidence <0.0-1.0>]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--dry-run` | false | Run judge only, skip execute stage (equivalent to `/maencof:maencof-reflect` but without the detailed report format) |
| `--layer` | 3,4,5 | Target Layer(s) to scan (3, 4, or 5) |
| `--min-confidence` | 0.7 | Minimum confidence threshold |
