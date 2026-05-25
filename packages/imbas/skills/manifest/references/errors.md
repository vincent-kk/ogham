# Error Handling — Provider-agnostic

Provider-specific errors are in `jira/errors.md` and `local/errors.md`. This
file lists errors that apply regardless of backend.

| Error | Action |
|-------|--------|
| Manifest not found | Display: "No `<type>`-manifest.json found for run `<run-id>`. Complete the preceding phase first." |
| No pending items | Display: "All items already created. Nothing to execute." |
| ID resolution fails (no `issue_ref` for referenced ID) | Skip link/subtask, log: "Cannot resolve `<ID>` — parent not yet created." |
| Partial failure mid-batch | Manifest is saved after each item. Re-run is safe — skips created items. |
