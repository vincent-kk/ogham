# Caching Policy

- **Issue content is NOT cached** — comments change frequently, so every call queries Jira
- Digest comment Fast Path reduces processing cost without caching
  (covered comment range is skipped, only new comments are fully analyzed)
- Project metadata (issue types, link types) uses the separate `imbas:cache` skill

# Agent Usage Patterns

| Agent | When | Purpose |
|-------|------|---------|
| `analyst` | Phase 1 (validate) | Reference existing related issues for context |
| `planner` | Phase 2 (split) | Understand Epic or existing Story context |
| `engineer` | Phase 3 (devplan) | Check Story comments for additional implementation discussion |
