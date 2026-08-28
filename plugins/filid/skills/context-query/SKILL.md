---
name: context-query
user-invocable: true
description: 'Resolve a path to its owner fractal and minimal INTENT/DETAIL chain, then answer a focused FCA question. Use when asking which fractal owns a file or which boundary contract applies before a change.'
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
  requests: [{ targetPath: "<target-path>" }]
})
```

Read `data.results[0]`, or the same result from the artifact when `data` is absent. If it is unresolved, outside the project, ownerless, or carries diagnostics, report that evidence and do not guess.

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

- One resolution call with one request item per question.
- Document references are loaded selectively; content is not requested from the tool.
- The chain order is owner toward root.
- Diagnostics and uncertain ownership remain visible.
