# imbas-digest — Error Handling

Provider-specific errors are in `jira/errors.md` and `local/errors.md`.

| Error | Action |
|-------|--------|
| Issue not found | Display: "Issue `{ref}` not found. Verify the issue reference." |
| No comments / no prior digest (empty source) | Display warning: "Issue `{ref}` has no comments or digest entries — decision/open-question extraction may be empty. Generating description-only summary." Proceed with description-only digest. |
| read-issue skill failure | Propagate the error from `imbas:imbas-read-issue`. |
