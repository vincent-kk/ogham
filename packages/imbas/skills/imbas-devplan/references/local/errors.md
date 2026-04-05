# Error Handling — Local Provider

Provider-agnostic devplan errors are in `../errors.md`.

| Error | Action |
|-------|--------|
| feedback_comment `target_ref` cannot be resolved to a local `S-<N>` ID | Skip the comment. Log warning: "Cannot resolve Story `<manifest ID>` to a local issue file." Continue. |
| Target local file missing at resolved path | Same as ISSUE_NOT_FOUND — log and skip the comment. |
