# Error Handling — Provider-agnostic

Provider-specific errors are in `jira/errors.md`, `github/errors.md`, and `local/errors.md`.

## Decomposition (Steps 1–7)

| Error                                         | Action                                                                      |
| --------------------------------------------- | --------------------------------------------------------------------------- |
| Precondition not met (refine incomplete)      | Display: "Phase 1 must complete first. Run /imbas:refine <source>."         |
| Estimate pending                              | Run the estimate-skip flow (preconditions.md) — user decides skip or stop.  |
| PASS_WITH_WARNINGS and user declines          | Display warnings and ask: "Proceed despite warnings, or re-refine?"         |
| Epic key not found                            | Display: "Epic <KEY> not found. Check the key or choose 'Create new Epic'." |
| `planner` produces no Stories                 | Trigger escape E2-3 if document is already atomic; otherwise E2-1.          |
| Manifest validation fails                     | Log errors, attempt auto-fix (ID dedup, link resolution), re-validate.      |
| mcp__plugin_imbas_tools__run_transition fails | Display precondition error from tool.                                       |

## Creation (Steps 8–11)

| Error                                                  | Action                                                                                     |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Manifest not found                                     | Display: "No stories-manifest.json found for run `<run-id>`. Run the decomposition first." |
| No pending items                                       | Display: "All items already created. Nothing to execute."                                  |
| ID resolution fails (no `issue_ref` for referenced ID) | Skip link, log: "Cannot resolve `<ID>` — parent not yet created."                          |
| Partial failure mid-batch                              | Manifest is saved after each item. Re-run is safe — skips created items.                   |
