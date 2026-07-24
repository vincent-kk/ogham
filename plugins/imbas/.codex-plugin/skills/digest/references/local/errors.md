# Error Handling — Local Provider

| Error | Action |
|-------|--------|
| `ISSUE_NOT_FOUND` | File at expected path missing. Display: "Local issue `<ID>` not found." |
| `## Digest` section missing from file | Create the section with a trailing newline before appending the first entry. Log info, not warning. |
| `Edit` append fails (file locked, permission, disk) | Display error. Offer to save digest as a separate file next to the original. |
| Invalid ID prefix | Display: "Invalid local issue ID: `<ID>`. Expected S-, T-, or ST- prefix." |
