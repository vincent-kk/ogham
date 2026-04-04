---
name: imbas-read-issue
user_invocable: false
description: >
  Internal skill. Reads a Jira issue with its full comment thread, reconstructs
  the conversation context, and returns a structured JSON summary.
version: "1.0.0"
complexity: moderate
plugin: imbas
---

# imbas-read-issue — Issue Context Reconstruction (Internal)

Internal skill that reads a Jira issue with its full comment thread, reconstructs
the conversation context (who said what, decisions made, latest state), and returns
a structured JSON summary. Called by validate, split, devplan, digest skills and
by imbas-analyst, imbas-planner, imbas-engineer agents.

## Arguments

```
imbas:read-issue <issue-key> [--no-cache] [--depth shallow|full]

<issue-key>  : Jira issue key (e.g., PROJ-123)
--no-cache   : Ignore cache, force re-query from Jira
--depth      : shallow = metadata + description only, full = include comments (default: full)
```

## References

- [Workflow](./workflow.md) — Steps 1–5: issue query, digest fast path, comment reconstruction, context synthesis, structured output
- [Output Schema](./output-schema.md) — JSON example and field reference table
- [Caching & Usage](./caching-and-usage.md) — Caching policy and agent usage patterns
- [Tools](./tools.md) — Atlassian MCP tools and agent spawn
- [Error Handling](./errors.md) — Error conditions and recovery actions
