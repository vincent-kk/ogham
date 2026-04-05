---
name: read-issue
user_invocable: false
description: "[imbas:read-issue] Internal skill. Reads a Jira issue with its full comment thread, reconstructs the conversation context, and returns a structured JSON summary."
version: "1.0.0"
complexity: moderate
plugin: imbas
---

# read-issue — Issue Context Reconstruction (Internal)

Internal skill that reads a Jira issue with its full comment thread, reconstructs
the conversation context (who said what, decisions made, latest state), and returns
a structured JSON summary. Called by validate, split, devplan, digest skills and
by imbas-analyst, imbas-planner, imbas-engineer agents.

## Arguments

```
imbas:read-issue <issue-key> [--depth shallow|full]

<issue-key>  : Jira issue key (e.g., PROJ-123)
--depth      : shallow = metadata + description only, full = include comments (default: full)
```

## References

- [Workflow](./references/workflow.md) — Steps 1–5: issue query, digest fast path, comment reconstruction, context synthesis, structured output
- [Output Schema](./references/output-schema.md) — JSON example and field reference table
- [Caching & Usage](./references/caching-and-usage.md) — Caching policy and agent usage patterns
- [Tools](./references/tools.md) — Atlassian MCP tools and agent spawn
- [Error Handling](./references/errors.md) — Error conditions and recovery actions
