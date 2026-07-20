---
name: cache
user_invocable: false
description: '[imbas:cache] Internal skill. Manages Jira project metadata cache (issue types, link types, workflows). Auto-refreshes when TTL expires.'
argument-hint: '<ensure|refresh|clear> [--project KEY]'
version: '1.0.0'
complexity: simple
plugin: imbas
---

# cache — Jira Metadata Cache Management (Internal)

Internal skill that manages Jira project metadata cache. Stores issue types, link types,
and workflow definitions locally to avoid repeated Atlassian API calls. Provides
`ensure`, `refresh`, and `clear` actions; auto-refreshes when the TTL (24 hours) expires.
Invoked by internal flows only (validate/split/devplan call `ensure`).

**Provider scope**: the fetch flows here are Jira-specific. For `github`,
metadata caching (label inventory) is handled by `setup` directly; for `local`,
caching is a no-op — when `config.provider != "jira"`, `ensure`/`refresh`
return immediately without fetching. The user-facing refresh path is
`/imbas:setup refresh-cache`, which runs its own provider-aware flow.

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
- [tools.md](./references/tools.md) — imbas and Jira operations ([OP:]) used, agent spawn
- [errors.md](./references/errors.md) — error conditions and responses
