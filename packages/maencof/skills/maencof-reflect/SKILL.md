---
name: maencof-reflect
user_invocable: true
description: "[maencof:maencof-reflect] Generates a read-only vault analysis report identifying layer transition candidates and duplicate documents, without making any filesystem changes. Run before organize to preview recommendations."
argument-hint: "[--layer 3|4|5] [--show-all]"
version: "1.0.0"
complexity: medium
context_layers: [1, 2, 3, 4, 5]
orchestrator: maencof-reflect skill
plugin: maencof
---

# maencof-reflect — Knowledge Vault Analysis Report

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
Equivalent to `/maencof:maencof-organize --dry-run` but generates a more detailed report.

## Workflow

### Step 1 — Query Vault Status

Query the current index status, node count, and stale node list via `kg_status`.

### Step 2 — Run judge Module

Execute memory-organizer judge logic:
- Full scan of Layer 3/4/5 (including sub-layer directories)
- Calculate transition score for each node (access frequency, tags, connection density, confidence)
- Detect duplicate candidate pairs
- **L5-Boundary analysis**: Evaluate cross-layer connection effectiveness — identify Boundary nodes with zero CROSS_LAYER edges (misconfigured) or excessive connections (>50 targets)

### Step 3 — Generate Report

```markdown
## Knowledge Vault Analysis Report

### Transition Candidates (Layer 3 -> Layer 2)
| File | Sub-Layer | Access Count | Tag Matching | confidence | Recommendation |
|------|-----------|-------------|-------------|-----------|----------------|

### Transition Candidates (Layer 4 -> Layer 3)
| File | Last Accessed | Expiration | Target Sub-Layer | Recommendation |

### L5-Buffer Promotion Candidates
| File | Age (days) | Connections | Recommended Target |

### L5-Boundary Health
| Boundary Node | Connected Layers | CROSS_LAYER Edges | Status |
(OK / No edges / Overcrowded)

### Duplicate Detection
| File A | File B | Common Tags | Similarity |

### Sub-Layer Distribution
| Layer | Sub-Layer | Count |
(L3: relational/structural/topical, L5: buffer/boundary)

### Summary
- Transition candidates: N
- Buffer promotion candidates: N
- Boundary health issues: N
- Duplicate document pairs: N
- Recommended action: run /maencof:maencof-organize
```

## MCP Tools (used by memory-organizer.judge)

| Tool | Purpose |
|------|---------|
| `kg_status` | Query vault status |
| `kg_navigate` | Traverse link relationships |
| `maencof_read` | Read document Frontmatter |

## Error Handling

- **No index**: "No index found. Please run `/maencof:maencof-build` first."
- **memory-organizer unavailable**: abort and guide to retry
- **No candidates found**: display empty report with summary "No transition candidates at current threshold."

### Auto-Insight Status

Include in reflection output:
- Auto-insight capture: enabled/disabled, sensitivity level
- Recent capture stats: total, L2, L5
- Noise ratio estimate: archived / total (if available)
- Recommendation: adjust sensitivity if noise ratio > 50%

## Options

```
/maencof:maencof-reflect [--layer <3|4|5>] [--show-all]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--layer` | 3,4,5 | Target Layer(s) to analyze |
| `--show-all` | false | Show all candidates regardless of confidence |
