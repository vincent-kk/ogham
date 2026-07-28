# setup — Snapshot Scan

> Reference for Phase 2 of `/filid:setup`.

Create the post-initialization snapshot projection:

```text
mcp__plugin_filid_tools__fractal_scan({
  path: "<target-path>",
  detail: "paths"
})
```

`detail: "paths"` returns the node paths, classifications, document state, and entry-point counts needed by setup without loading the full snapshot. The summary remains available even when detailed data is persisted as an artifact.

Treat a returned artifact as the canonical full payload for this call. Read only the fields needed to prepare the setup report. Do not load unrelated snapshot evidence into context.

Preserve these conditions in the working set:

- `status` and diagnostics, including `unsupported` or `indeterminate`
- project root and snapshot hash
- adapter IDs and certainty
- node path, type, INTENT/DETAIL state, and entry-point count

This phase is read-only. It never edits project source or configuration.
