# setup — Validation and Report

> Reference for Phase 3–4 of `/filid:setup`.

Validate the post-initialization snapshot:

```text
mcp__plugin_filid_tools__fractal_inspect({
  action: "validate",
  path: "<target-path>",
  scopes: ["documents", "nodes", "entry-points"]
})
```

Read the findings from the returned result or, when the payload is persisted, from its artifact — the same handling `section-1-directory-scan.md` applies to the scan call.

The setup report combines this result with `fractal_inspect` action `scan` using `detail: "paths"`. It must not claim compliance when either action returns diagnostics, a non-exact certainty, or a non-OK status.

Use this compact format:

```text
FCA-AI Setup Report
===================
Project root          : <path>
Snapshot hash         : <hash>
Adapters              : <ids>
Nodes                 : <counts by type>
Missing INTENT.md     : <count and proposed paths>
Missing DETAIL.md     : <count and proposed paths>
Validation findings   : <count by severity>
Certainty             : <certainty>
Diagnostics           : <list or "none">
```

The missing-document sections are proposals only. State explicitly that setup did not edit source documents.
