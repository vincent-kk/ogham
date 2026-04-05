# Error Handling — Local Provider

| Error | Action |
|-------|--------|
| `ISSUE_NOT_FOUND` | File at expected path (`.imbas/<KEY>/issues/<type>/<ID>.md`) missing. Return error: "Local issue `<ID>` not found." |
| Frontmatter parse failure | Log warning with the offending lines. Return a partial result with description only; set `participants: []`. |
| Missing `## Description` section | Treat as empty description (`description_excerpt: ""`). Continue processing. |
| Invalid ID prefix (not `S-`/`T-`/`ST-`) | Return error: "Invalid local issue ID: `<ID>`. Expected prefix S-, T-, or ST-." |
