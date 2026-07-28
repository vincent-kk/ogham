---
name: guide
user_invocable: true
description: '[filid:guide] Explain the current FCA tree, classifications, validation findings, and evidence-based placement rules without changing project structure.'
argument-hint: '[path]'
version: '2.0.0'
complexity: simple
plugin: filid
---

# guide — Current FCA Structure

Produce a human-readable guide to the current tree and its placement rules. The guide describes observed evidence and does not modify files.

See [reference.md](./reference.md) for exact calls, placement interpretation, and output format.

## When to Use

- onboarding a team to the current FCA structure
- locating fractal, organ, pure-function, and hybrid nodes
- understanding current document, entry-point, boundary, or DAG findings
- deciding where a new module belongs before requesting a movement plan

Use `/filid:scan` for the full audit verdict. Use `/filid:restructure` when a specific source-to-target plan and postconditions are needed.

## Workflow

### Phase 1 — Current Tree

Call:

```text
mcp__plugin_filid_tools__fractal_scan({
  path: "<target-path>",
  detail: "paths"
})
```

Use the returned classifications, document state, and entry-point counts directly. Preserve snapshot hash, adapter IDs, certainty, status, and diagnostics.

### Phase 2 — Current Findings

Call:

```text
mcp__plugin_filid_tools__structure_validate({
  path: "<target-path>",
  mode: "project",
  scopes: [
    "documents",
    "nodes",
    "entry-points",
    "boundaries",
    "dag",
    "verification"
  ]
})
```

Read the findings from the returned result or, when the payload exceeds the inline envelope budget, from its artifact. All six scopes at once is the largest payload this skill requests; an absent inline `data` is not an empty finding set.

Present configured validation by scope and cite rule IDs from actual findings. Do not invent a separate active-rule list.

### Phase 3 — Placement Guidance

Explain placement from the observed owner graph:

- shared code goes at the nearest common ancestor of consumers
- new fractals require documented boundaries and an entry point
- organs stay flat and do not contain INTENT.md
- external imports use module entry points
- sibling imports target the sibling entry point
- dependencies remain acyclic

When consumers or ownership are uncertain, label the answer unresolved rather than naming a target path.

### Phase 4 — Guide

Emit the current-structure table, current findings, placement rules, and new module checklist from the reference. Non-OK status or diagnostics remain visible.

## MCP Surface

| Tool                                          | Purpose                                                          |
| --------------------------------------------- | ---------------------------------------------------------------- |
| `mcp__plugin_filid_tools__fractal_scan`       | current tree, classifications, documents, and entry-point counts |
| `mcp__plugin_filid_tools__structure_validate` | current FCA findings by canonical scope                          |

## Invariants

- Guide is read-only.
- It distinguishes observed facts from unresolved placement.
- It never claims that Filid's validation call moves files or rewrites imports.
- A fractal below an organ remains visible as an independent node.
