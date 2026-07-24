# digest — Digest Marker Specification (Jira only)

> **Provider scope**: This file documents the Jira-only digest marker comment
> format. Local provider uses append-only `## Digest` section entries with
> timestamp subheadings instead — see `local/workflow.md`. This file is
> referenced from `jira/workflow.md` and `SKILL.md` / `README.md`.


## Marker Format

```
<!-- imbas:digest v{version} | generated: {ISO8601} | comments_covered: {start}-{end} -->
...digest content...
<!-- /imbas:digest -->
```

| Field | Description |
|-------|-------------|
| `v{version}` | Digest format version (currently `v1`) |
| `generated` | ISO 8601 timestamp of digest generation |
| `comments_covered` | Range of comment indices analyzed (e.g., `1-15`) |

The digest marker serves two purposes:
1. **Machine-readable** — `imbas:read-issue` skill detects this marker for Fast Path optimization
2. **Human-readable** — clearly marks AI-generated content with coverage scope

## Re-run Behavior

When re-running digest on the same issue:
- Detect existing digest comment via marker
- Only analyze comments after the covered range (e.g., comments 16+)
- Post a new digest comment (do not edit the old one)
- New digest references the full range (e.g., `comments_covered: 1-22`)
