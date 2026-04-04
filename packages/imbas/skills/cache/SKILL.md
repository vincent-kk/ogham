---
name: cache
user_invocable: false
description: >
  Internal skill. Manages Jira project metadata cache (issue types, link types,
  workflows). Auto-refreshes when TTL expires.
version: "1.0.0"
complexity: simple
plugin: imbas
---

# cache — Jira Metadata Cache Management (Internal)

Internal skill that manages Jira project metadata cache. Stores issue types, link types,
and workflow definitions locally to avoid repeated Atlassian API calls. Auto-refreshes
when the TTL (24 hours) expires. Called by setup, validate, split, and devplan skills.

## Arguments

```
imbas:cache <action> [--project <KEY>]

<action>   : "ensure" | "refresh" | "clear"
--project  : Jira project key (falls back to config.defaults.project_ref if omitted)
```

## References

- [actions.md](./references/actions.md) — ensure, refresh, and clear action workflows
- [cache-structure.md](./references/cache-structure.md) — directory layout and JSON schemas
- [ttl-logic.md](./references/ttl-logic.md) — TTL check algorithm and user access path
- [tools.md](./references/tools.md) — imbas and Atlassian MCP tools used, agent spawn
- [errors.md](./references/errors.md) — error conditions and responses
