# Error Handling — Local Provider

Provider-agnostic errors are in `../errors.md`. This file lists local-specific
error cases.

| Error | Action |
|-------|--------|
| `ISSUE_NOT_FOUND` | File at expected path is missing. Treated as DRIFT_DELETED in Step 2.5; triggers WARN + user prompt. |
| `ISSUE_DUPLICATE` | Two files with the same ID across different type directories. Should be impossible with prefix-by-type IDs (`S-`/`T-`/`ST-`). If it happens, abort with "Integrity error: `<ID>` exists in multiple type directories. Manual cleanup required." |
| `Write` fails mid-batch | The manifest is saved after each item, so re-running resumes from the next pending item. No rollback required. |
| `Edit` on link target fails (one side written, other side not) | Leaves link half-written. On re-run, detect asymmetry via `check-bidirectional-links.mjs` and repair. For v1, report and continue. |
| `.imbas/<KEY>/issues/` directory missing | Auto-create via `mkdir -p` equivalent during Step 4 before first `Write`. Setup phase should have created it. |
| Concurrent writer detected (timestamps or lock file found) | OUT OF SCOPE v1. Single-writer invariant is assumed. If detected in future, abort with clear message. |
