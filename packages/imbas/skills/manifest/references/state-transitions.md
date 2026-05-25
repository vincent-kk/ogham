# State Transitions

This skill does not directly modify run state (state.json). It operates on manifest files only.

## Preconditions for Execution

- stories manifest: (split.status == "completed" AND split.pending_review == false) OR (split.status == "escaped" AND split.escape_code == "E2-3")
- devplan manifest: devplan.status == "completed", devplan.pending_review == false

## Manifest Item Status

The manifest itself tracks per-item state via status field:

```
"pending"  → item not yet created in Jira
"created"  → item created, issue_ref populated
"failed"   → creation attempted but failed (retryable)
"skipped"  → intentionally skipped (e.g., umbrella Story)
"partial"  → 1:N link expansion: some targets succeeded, some failed
```
