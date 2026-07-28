# setup — Project and Rule Documents

> Reference for Phase 1 of `/filid:setup`. See [../SKILL.md](../SKILL.md) for
> the continuous workflow.

## Initialize the project

Call:

```text
mcp__plugin_filid_tools__project_init({
  path: "<target-path>",
  language: "<session-language>",
  adapterIds: ["<explicit-adapter-id>"]
})
```

- `path` is required.
- Omit `language` when the session does not specify an output language.
- Omit `adapterIds` for automatic adapter selection. If supplied, it must be
  non-empty and its order is preserved.
- Existing `.filid/config.json` content is never overwritten.
- This call creates config only; managed rule documents remain a separate
  operation.

## Reconcile managed rule documents

Inspect the deployment first:

```text
mcp__plugin_filid_tools__rule_docs_sync({
  action: "status",
  path: "<absolute-target-path>"
})
```

On an interactive local host, call:

```text
mcp__plugin_filid_tools__open_settings({
  path: "<absolute-target-path>",
  waitSeconds: 300
})
```

The page owns config and managed-document persistence. Dispatch on the stable
status:

- `saved`: retain the returned save summary and continue.
- `closed`: keep the existing state and continue.
- `pending`: call once more. If still pending, return the URL and stop because
  the user interaction has not completed.

In a headless environment, do not invent a config editing path. Use
`rule_docs_sync` directly:

1. `action: "manifest"` to discover managed IDs.
2. `action: "status"` to inspect deployed state.
3. `action: "sync"` with `selections` and optional `resync`.

Required documents are always deployed. Optional drift is overwritten only
when its ID is explicitly present in `resync`. An `unsupported` status or any
diagnostic is reported and is not treated as successful synchronization.

`--rules` stops after this phase. It does not scan or validate the project.
