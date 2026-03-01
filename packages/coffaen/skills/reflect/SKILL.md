---
name: reflect
user_invocable: true
description: memory-organizer judge module read-only analysis — transition candidates and duplicate detection report
version: 1.0.0
complexity: medium
context_layers: [1, 2, 3, 4, 5]
orchestrator: reflect skill
plugin: coffaen
---

# reflect — Knowledge Vault Analysis Report

Runs only the **judge module** of memory-organizer to analyze transition candidates and duplicate documents.
Generates a pure analysis report with no filesystem changes.

## When to Use This Skill

- When you want to understand the current state of the knowledge vault (without making changes)
- When you want to preview which documents are transition candidates
- When you only want to see the duplicate document detection results
- "reflection", "knowledge status", "check transition candidates"

## Agent Collaboration Sequence

```
[reflect skill] -> [memory-organizer.judge] -> TransitionDirective[]
                                           |
                               generate analysis report (no file changes)
```

**Orchestrator**: the reflect skill calls only the judge module and skips execute.
Equivalent to `/coffaen:organize --dry-run` but generates a more detailed report.

## Workflow

### Step 1 — Query Vault Status

Query the current index status, node count, and stale node list via `kg_status`.

### Step 2 — Run judge Module

Execute memory-organizer judge logic:
- Full scan of Layer 3/4
- Calculate transition score for each node (access frequency, tags, connection density, confidence)
- Detect duplicate candidate pairs

### Step 3 — Generate Report

```markdown
## Knowledge Vault Analysis Report

### Transition Candidates (Layer 3 -> Layer 2)
| File | Access Count | Tag Matching | confidence | Recommendation |
|------|-------------|-------------|-----------|----------------|

### Transition Candidates (Layer 4 -> Layer 3)
| File | Last Accessed | Expiration | Recommendation |

### Duplicate Detection
| File A | File B | Common Tags | Similarity |

### Summary
- Transition candidates: N
- Duplicate document pairs: N
- Recommended action: run /coffaen:organize
```

## MCP Tools (used by memory-organizer.judge)

| Tool | Purpose |
|------|---------|
| `kg_status` | Query vault status |
| `kg_navigate` | Traverse link relationships |
| `coffaen_read` | Read document Frontmatter |

## Error Handling

- **No index**: "No index found. Please run `/coffaen:build` first."
- **memory-organizer unavailable**: abort and guide to retry
- **No candidates found**: display empty report with summary "No transition candidates at current threshold."

## Options

```
/coffaen:reflect [--layer <1-5>] [--show-all]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--layer` | 3,4 | Target Layer(s) to analyze |
| `--show-all` | false | Show all candidates regardless of confidence |
