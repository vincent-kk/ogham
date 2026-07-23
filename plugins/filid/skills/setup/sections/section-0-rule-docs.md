# setup — Config & Settings Page (Phase 0a~0b)

> Detail reference for Phase 0a~0b of /filid:setup.
> See [../SKILL.md](../SKILL.md) for the skill overview and phase chaining.

Phase 0 has two sub-phases. Phase 0a creates the config; Phase 0b opens the
browser settings page where the user edits `.filid/config.json` AND selects
rule docs in one form. The settings server persists both on Save — the skill
does not call `rule_docs_sync` in this flow.

Phase 0 is the full scope of the `--rules` invocation mode; Phase 1–5 are
skipped in that mode (see [Rules-only Mode](#rules-only-mode---rules) below).

## Phase 0a — Config Initialization

Call `mcp__plugin_filid_tools__project_init` to ensure `.filid/config.json` exists at the git root:

```
mcp__plugin_filid_tools__project_init({ path: "<target-path>", language: "<session-language>" })
```

Resolve `<session-language>` from the Claude Code session's response language
— the `# Language` directive in your system context. Use the language's
English name (e.g. `Korean`, `Japanese`, `English`). Do NOT use `[filid:lang]`
for this — until the config exists `[filid:lang]` is always `en`, so it cannot
seed itself. If the session has no explicit language directive, omit the
`language` argument entirely; the config then defaults to English.

The handler:

- Resolves the git repository root from `path`
- Creates `.filid/config.json` if absent, with the default 8-rule configuration
- Records `language` in the config when the argument is provided
- Never overwrites an existing config

`mcp__plugin_filid_tools__project_init` does NOT touch `.claude/rules/` — that is the settings
page's job in Phase 0b. Rule doc state is tracked on the filesystem only
(`.claude/rules/*.md`), never mirrored into `.filid/config.json`.

## Phase 0b — Settings Page <!-- [INTERACTIVE] -->

Decide whether to open the browser at all — inspect rule-doc state first:

```
mcp__plugin_filid_tools__rule_docs_sync({ action: "status", path: "<absolute-target-path>" })
```

- **`status.entries` empty** — the plugin ships no optional rule docs, so
  nothing is selectable and the browser's only remaining surface is the config
  form, which the CLI covers better. Skip `open_settings`; apply required docs
  directly and redirect config:
  ```
  mcp__plugin_filid_tools__rule_docs_sync({ action: "sync", path: "<absolute-target-path>", selections: {} })
  ```
  Print the one-line `result.summary` (required docs auto-deploy), add
  `"Config: edit .filid/config.json or run /filid:config-wizard."`, and treat
  this as a `saved` status for the phase chaining below.
- **`status.entries` non-empty** — optional docs are selectable; the browser's
  pre-checked UX earns its cost. Open it (below).

Call `mcp__plugin_filid_tools__open_settings` with the ABSOLUTE target path:

```
mcp__plugin_filid_tools__open_settings({ path: "<absolute-target-path>", waitSeconds: 300 })
```

The tool starts (or reuses) a `127.0.0.1` settings server, opens the browser
form, and **blocks inside the call** until the user saves, closes the page,
or the bounded wait elapses. The page edits, in one form:

- the 8 structural rules (`enabled` / `severity` / `exempt` globs)
- `language`, `scan.maxDepth`, and the three `additional-*` arrays
- rule doc deployment — optional docs render as checkboxes **pre-checked from
  filesystem state** (no re-select trap); drifted docs show an `UPDATE
AVAILABLE` badge plus an explicit "overwrite local edits" opt-in per row;
  required docs are listed read-only and auto-sync on save

On Save the server persists everything (`writeConfig` + `syncRuleDocs`) and
the tool returns. Dispatch on `result.status`:

- **`saved`** — surface a one-line summary from `result.summary.ruleDocs`
  (`copied` / `updated` / `removed` / `drift` / `unchanged` / `skipped` —
  same shape as `rule_docs_sync`), e.g.
  `"Rule docs: copied=1, updated=1, removed=0, drift=0, unchanged=3"`.
  When `drift` is non-empty append TWO hint lines (translate to `[filid:lang]`):
  - Line 1 (status): `"Drift detected: ${drift.join(', ')}"`
  - Line 2 (action): `"→ Accept template update: re-run /filid:setup --rules and check the overwrite box on UPDATE items. Keep local edits: ignore."`
    If `summary.ruleDocs.skipped` is non-empty, print each `{ id, reason }` as
    a warning but DO NOT abort.
- **`pending`** — the user has not saved within the wait. Call
  `mcp__plugin_filid_tools__open_settings` ONCE more with the same arguments (the running
  server is reused; no new browser tab). If the second call is still
  `pending`, tell the user the page is open at `result.url` and STOP —
  re-running `/filid:setup` resumes against the saved (or unchanged) config.
- **`closed`** — the user closed the page without saving. Keep the existing
  config and continue.

If the tool errors (e.g. workspace root unresolvable), surface the error and
STOP — do not improvise a chat-based fallback.

**→ After dispatching on `status`, immediately proceed (same response): with
`--rules` STOP here with a short completion line; otherwise continue to
Phase 1.**

### Headless / CI fallback

`open_settings` needs a local browser. Automation that cannot open one
(CI, remote shells) reconciles rule docs directly instead:
`mcp__plugin_filid_tools__rule_docs_sync({ action: "status", path })` to inspect, then
`{ action: "sync", path, selections, resync }` to apply — the pre-page
behaviour. Config edits in those environments go through
`/filid:config-wizard`.

## Re-entry Behaviour

`/filid:setup` is safe to run repeatedly. On a second or later invocation:

- Phase 0a is a no-op (config already exists)
- Phase 0b renders the page from current filesystem state — deployed
  optional docs arrive pre-checked, drifted docs carry the `UPDATE` badge,
  and existing config values prefill the form. Unchecking a deployed doc
  removes it on save; leaving the overwrite box unchecked preserves local
  edits (drift is reported, file untouched).

This makes the settings page the **single management entry point** for
config and optional rule doc toggling.

## Rules-only Mode (`--rules`)

When the user passes `--rules`, the skill runs Phase 0a → Phase 0b and then
stops. This is useful when:

- The user wants to toggle optional rule docs or tweak config without
  triggering a full project scan
- The plugin shipped a new template and the user wants to accept the
  `UPDATE` on deployed rules without regenerating INTENT.md/DETAIL.md

The skill prints a short completion line after Phase 0b in this mode (e.g.,
`"Settings saved — Phase 1–5 skipped"`) and emits nothing from Phase 1–5.

## Gitignore Recommendation

If `.filid/review/` or `.filid/cache/` are not in `.gitignore`, inform the user:

```
[INFO] Consider adding to .gitignore:
  .filid/review/
  .filid/cache/
```

`.filid/config.json` and every applied `.claude/rules/*.md` file
should be committed to version control.
