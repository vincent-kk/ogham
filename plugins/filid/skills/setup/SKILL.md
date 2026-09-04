---
name: setup
user-invocable: true
disable-model-invocation: true
description: 'Initialize Filid config and managed rule documents, inspect the FCA snapshot, and propose missing INTENT.md/DETAIL.md work.'
argument-hint: '[path] [--rules]'
version: '2.1.0'
complexity: medium
plugin: filid
---

# setup — Filid 1.0 Initialization

Initialize config and managed rule documents, then inspect the resulting FCA snapshot. Setup reports missing document contracts as proposals; it does not write project source documents.

Run the phases continuously. The settings page is the only interactive pause. Do not summarize large tool payloads between phases.

## References

Load only the reference needed for the active phase:

- [Project and rule documents](./sections/section-0-rule-docs.md)
- [Snapshot scan](./sections/section-1-directory-scan.md)
- [Classification interpretation](./sections/section-2-node-classification.md)
- [INTENT.md proposal](./sections/section-3-intent-md-template.md)
- [DETAIL.md proposal](./sections/section-4-detail-md-scaffolding.md)
- [Validation and report](./sections/section-5-validation-report.md)

## When to Use

- initializing Filid in a new or existing repository
- selecting adapters and output language in config v2
- reconciling managed FCA rule documents
- discovering missing INTENT.md or DETAIL.md contracts
- rechecking initialization after a structural change

Use `/filid:scan` for a complete FCA audit. Setup validates the initialization surface and prepares document proposals.

## Arguments

- `path`: target project path; defaults to the current working directory
- `--rules`: run project initialization and managed-rule settings only, then stop before snapshot inspection

Resolve the absolute target path for settings and rule-document calls.

## Workflow

### Phase 1 — Config and Managed Rules

1. Call `mcp__plugin_filid_tools__project_setup` with `action: "init"`, `path`, optional session `language`, and optional non-empty `adapterIds`.
2. Call `mcp__plugin_filid_tools__project_setup` with `action: "rules-status"`.
3. On an interactive local host, call `mcp__plugin_filid_tools__project_setup` with `action: "settings"` and a bounded wait, then dispatch on `saved`, `closed`, or `pending`.
4. In a headless environment, use `project_setup` actions `rules-manifest`, `rules-status`, and `rules-sync`; do not invent another config editing workflow.

If `--rules` is present, emit the managed-rule summary and stop.

### Phase 2 — Post-Initialization Snapshot

Call:

```text
mcp__plugin_filid_tools__fractal_inspect({
  action: "scan",
  path: "<target-path>",
  detail: "paths"
})
```

Use returned classifications and document states directly. Preserve diagnostics, certainty, status, and snapshot hash. Do not manually reclassify nodes.

### Phase 3 — Initialization Validation

Call:

```text
mcp__plugin_filid_tools__fractal_inspect({
  action: "validate",
  path: "<target-path>",
  scopes: ["documents", "nodes", "entry-points"]
})
```

Non-OK status, diagnostics, or non-exact certainty remain visible and prevent a clean result.

### Phase 4 — Missing-Document Proposals

Combine path detail with validation findings:

- propose INTENT.md only for fractals that lack it
- propose DETAIL.md only when a public boundary is evidenced and undocumented
- never propose INTENT.md for organs
- preserve existing documents without modification
- mark uncertain public boundaries as unresolved

Emit the compact setup report from the validation reference and finish. Do not ask a follow-up question.

## MCP Surface

| Tool + action                                             | Purpose                                                       |
| --------------------------------------------------------- | ------------------------------------------------------------- |
| `mcp__plugin_filid_tools__project_setup` `init`           | create missing config v2 without overwriting existing config  |
| `mcp__plugin_filid_tools__project_setup` `rules-*`        | inspect or synchronize managed rule documents                 |
| `mcp__plugin_filid_tools__project_setup` `settings`       | edit config and managed rules through a bounded local session |
| `mcp__plugin_filid_tools__fractal_inspect` `scan`         | inspect the post-initialization snapshot                      |
| `mcp__plugin_filid_tools__fractal_inspect` `validate`     | validate document, node, and entry-point scopes               |

## Invariants

- Setup may change only config and managed rule documents through their dedicated tools.
- Setup never authors, deletes, or overwrites INTENT.md, DETAIL.md, source, or generated plugin artifacts.
- Required managed documents remain deployed.
- Optional drift is overwritten only by explicit resynchronization.
- A diagnostic or uncertain result is reported, never converted to PASS.
