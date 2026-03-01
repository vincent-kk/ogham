---
name: organize
user_invocable: true
description: memory-organizer agent orchestration — knowledge transition recommendation and execution
version: 1.0.0
complexity: high
context_layers: [1, 2, 3, 4, 5]
orchestrator: organize skill
plugin: coffaen
---

# organize — Knowledge Transition Orchestration

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
              -> [memory-organizer.execute] -> coffaen_move execution
                                             |
                               [index-invalidator hook] -> stale-nodes update
```

**Orchestrator**: the organize skill coordinates the entire flow.
Calls the memory-organizer agent sequentially through judge -> (confirmation) -> execute stages.

## Workflow

### Step 1 — Pre-check Index Status

Check vault status and stale nodes with the `kg_status` MCP tool before delegating to the agent.
If no index is found, abort with: "No index found. Please run `/coffaen:build` first."

### Step 2 — judge stage (memory-organizer delegation)

Run the judge module of the `memory-organizer` agent:
- Scan Layer 3/4 files
- Evaluate access frequency, tag matching, and connection density
- Generate a list of TransitionDirectives

### Step 3 — Display Candidates and User Confirmation

Display the generated TransitionDirectives in table format:

```
| File | Current Layer | Target Layer | Reason | Confidence |
```

The user can type "proceed" or select/exclude individual items.

### Step 4 — execute stage (memory-organizer delegation)

Run the execute module for approved TransitionDirectives:
- Call `coffaen_move`
- Update the Frontmatter `layer` field
- Update link paths

### Step 5 — Result Summary

Output the list of executed transitions and an AgentExecutionResult summary.

## Available MCP Tools

> The organize skill is an orchestrator. MCP tools are invoked by the memory-organizer agent,
> not directly by this skill. The skill coordinates the workflow and user confirmation flow.

| Tool | Used by | Purpose |
|------|---------|---------|
| `kg_status` | skill (Step 1) | Check vault status and stale-nodes |
| `kg_navigate` | memory-organizer agent | Traverse link relationships |
| `coffaen_move` | memory-organizer agent (execute module) | Execute file move |
| `coffaen_update` | memory-organizer agent (execute module) | Update Frontmatter |

## Error Handling

- **No index**: "No index found. Please run `/coffaen:build` first."
- **memory-organizer unavailable**: abort and guide to retry
- **coffaen_move failure**: skip the failed item, report it, and continue with remaining transitions
- **User cancels confirmation**: abort execute stage; no filesystem changes made
- **No transition candidates found**: "No transition candidates found at the current confidence threshold. Try `--min-confidence 0.5` to lower the threshold."

## Options

```
/coffaen:organize [--dry-run] [--layer <3|4|5>] [--min-confidence <0.0-1.0>]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--dry-run` | false | Run judge only, skip execute stage (equivalent to `/coffaen:reflect` but without the detailed report format) |
| `--layer` | 3,4 | Target Layer(s) to scan (3, 4, or 5) |
| `--min-confidence` | 0.7 | Minimum confidence threshold |
