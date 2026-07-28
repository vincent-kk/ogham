---
name: context-query
user_invocable: true
description: '[filid:context-query] Resolve a target path to its owner fractal and minimal owner-to-root INTENT/DETAIL reference chain, then answer a focused FCA question within three rounds.'
argument-hint: '<question>'
version: '2.0.0'
complexity: simple
plugin: filid
---

# context-query — Minimal FCA Context

Answer a focused ownership, boundary, public-contract, or placement-context question from the smallest relevant document chain.

See [reference.md](./reference.md) for evidence selection, the three-round budget, and response shape.

## When to Use

- identifying which fractal owns a file or directory
- reading the applicable boundary chain before a change
- locating the nearest DETAIL.md contract
- checking placement context without loading the whole project

Use `/filid:guide` for a project-wide human-readable map and `/filid:scan` for a complete audit.

## Workflow

### Round 1 — Resolve

Parse a project path and target path from the question, then call:

```text
mcp__plugin_filid_tools__context_resolve({
  path: "<project-path>",
  targetPath: "<target-path>"
})
```

If the target is outside the project, has no owner, or returns diagnostics, report that evidence and do not guess.

### Round 2 — Read Minimal Documents

Read only the returned INTENT.md or nearest DETAIL.md references needed for the question. Do not load sibling, cousin, or unrelated ancestor documents.

### Round 3 — Answer

Answer in the returned output language. Name the owner, cite every document path used, and state certainty and diagnostics.

If the evidence cannot fit the budget, report what is known and list the unread referenced paths. Do not fall back to a broad project scan.

## MCP Surface

| Tool                                       | Purpose                                                                                   |
| ------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `mcp__plugin_filid_tools__context_resolve` | resolve the owner fractal, minimal document chain, nearest DETAIL.md, and output language |

## Invariants

- One resolution call per question.
- Document references are loaded selectively; content is not requested from the tool.
- The chain order is owner toward root.
- Diagnostics and uncertain ownership remain visible.
