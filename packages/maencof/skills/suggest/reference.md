# suggest — Reference

Detailed workflow steps, display format, and error handling.

## Workflow Detail

### Step 1 — Check Index Status

```
kg_status()
```

- No index → "No index found. Please run `/maencof:build` first." (abort)
- `rebuildRecommended: true` → warn: "The index is stale. Suggestions may be inaccurate. `/maencof:rebuild` is recommended."
- Ask user whether to continue if stale

### Step 2 — Determine Suggestion Target

Determine the target from user input:

| Input Type | Detection | Parameter |
|-----------|-----------|-----------|
| Direct file path | contains `.md` or `/` | `path` |
| Tags | comma-separated keywords | `tags` |
| Free text | description | `content_hint` |
| Not specified | — | ask user |

### Step 3 — Run Link Suggestion

```
kg_suggest_links(
  path: target document path (if specified),
  tags: [tag list] (if specified),
  content_hint: "free text" (if specified),
  max_suggestions: --max value (default 5),
  min_score: --min-score value (default 0.2)
)
```

If 0 results: "No related documents found above the minimum score threshold. Try lowering `--min-score` or using different tags."

### Step 4 — Display Results

```markdown
## Link Suggestions for "{target}"

| # | Document | Layer | Score | Reason |
|---|----------|-------|-------|--------|
| 1 | {target_title} | L{target_layer} | {score} | {reason} |
| 2 | ... | ... | ... | ... |

Tags: {target_tags}
SA Score: {sa_score} | Tag Score: {tag_score}

Enter a number to view document details, or 'q' to finish.
```

### Step 5 — User Action

After reviewing suggestions:

- If user selects a suggestion → read the document with `maencof_read` and show content
- Guide user to manually add links in the source document if desired
- Suggest running `/maencof:explore {path}` for deeper exploration of a specific result

## Error Handling

- **No index**: guide to run `/maencof:build`
- **0 results**: suggest lowering `--min-score` or using different tags/content
- **Invalid path**: "Document not found at the specified path."
- **Stale index**: display warning and continue (user choice)
