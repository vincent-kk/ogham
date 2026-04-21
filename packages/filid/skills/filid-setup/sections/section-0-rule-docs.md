# filid-setup — Rule Docs Management (Phase 0a~0d)

> Detail reference for Phase 0a~0d of /filid:filid-setup.
> See [../SKILL.md](../SKILL.md) for the skill overview and phase chaining.

Phase 0 is split into four sub-phases. Phase 0a creates the config,
Phase 0b inspects current rule doc state, Phase 0c asks the user which
rule docs to apply (the ONLY interactive checkpoint in this skill), and
Phase 0d persists the decision and synchronises `.claude/rules/`.

Phase 0 is the full scope of the `--rules` invocation mode; Phase 1–5 are
skipped in that mode (see [Rules-only Mode](#rules-only-mode---rules) below).
Re-entry behaviour is documented at [Re-entry Behaviour](#re-entry-behaviour).

## Phase 0a — Config Initialization

Call `mcp_t_project_init` to ensure `.filid/config.json` exists at the git root:

```
mcp_t_project_init({ path: "<target-path>" })
```

The handler:

- Resolves the git repository root from `path`
- Creates `.filid/config.json` if absent, with the default 8-rule configuration
- Never overwrites an existing config

Default config shape:

```json
{
  "version": "1.0",
  "rules": {
    "naming-convention": { "enabled": true, "severity": "warning" },
    "organ-no-intentmd": { "enabled": true, "severity": "error" },
    "index-barrel-pattern": { "enabled": true, "severity": "warning" },
    "module-entry-point": { "enabled": true, "severity": "warning" },
    "max-depth": { "enabled": true, "severity": "error" },
    "circular-dependency": { "enabled": true, "severity": "error" },
    "pure-function-isolation": { "enabled": true, "severity": "error" },
    "zero-peer-file": { "enabled": true, "severity": "warning" }
  }
}
```

`mcp_t_project_init` does NOT touch `.claude/rules/` — that is handled by
Phase 0b below. Rule doc state is tracked on the filesystem only
(`.claude/rules/*.md`), never mirrored into `.filid/config.json`.

## Phase 0b — Rule Docs Status

Call `mcp_t_rule_docs_sync` with `action: "status"` to inspect the current state
of every rule doc declared in the plugin manifest:

```
mcp_t_rule_docs_sync({ action: "status", path: "<target-path>" })
```

The response partitions rules into two disjoint lists:

- `status.entries[]` — **optional** rules only. This is the ONLY list
  rendered as checkboxes in Phase 0c. Each entry:
  ```
  {
    id, filename, required: false, title, description,
    deployed, selected,
    templateHash, deployedHash, inSync
  }
  ```
  `deployed` reflects filesystem state under `.claude/rules/` and
  `selected === deployed` for optional rules (no config-side tracking).
  `templateHash` is the SHA-256 of the plugin-shipped template;
  `deployedHash` is the SHA-256 of the file on disk (or `null` when the
  file is absent or unreadable); `inSync === (deployed && deployedHash === templateHash)`.
  A deployed entry with `inSync === false` signals template drift — the
  plugin shipped a newer version than what the user has on disk.
- `status.autoDeployed[]` — **required** rules. Always auto-synced by
  `mcp_t_rule_docs_sync({ action: "sync" })` regardless of user input.
  Drifted required rules are overwritten unconditionally; the user cannot
  opt out and no confirmation is required. Use this list for the Phase 0d
  summary line — NEVER render these entries as checkboxes.

Build an internal map `currentSelection: Record<string, boolean>` from
`status.entries` only (`selected` field). Do NOT include any required
entries — they are implicit and must not appear in the UI.

If `status.pluginRootResolved` is `false`, fail fast: the plugin is running
without `CLAUDE_PLUGIN_ROOT` set, which means `mcp_t_rule_docs_sync` cannot
locate the manifest. Surface an error message and skip Phase 0c/0d.

## Phase 0c — Rule Docs Prompt <!-- [INTERACTIVE] -->

Dispatch on `N = status.entries.length` (number of **optional** rules only).
Required rules from `status.autoDeployed[]` are enforced by the sync handler
and MUST NEVER appear in the option list in any case.

`AskUserQuestion` requires a **minimum of 2 options per question**, so the
prompt shape depends on `N`. Compute `nextSelection: Record<string, boolean>`
keyed by optional rule `id` (required rules MUST NOT appear in it):

### Case A — `N === 0` (no optional rules)

Skip `AskUserQuestion` entirely. Set `nextSelection = {}` and proceed to
Phase 0d. Required rules still get auto-applied by `syncRuleDocs`.

### Case B — `N === 1` (exactly one optional rule)

A one-item multi-select is invalid (min 2 options). Render a
**single-select Yes/No prompt** whose two options represent the two
possible states of that single rule. Three label states are possible,
driven by `deployed` and `inSync`:

- `!deployed` → `Apply: ${entry.title}`
- `deployed && inSync` → `[ON] Keep: ${entry.title}`
- `deployed && !inSync` → `[UPDATE] Apply latest: ${entry.title}`
  (signals the plugin template has changed; re-applying overwrites the
  deployed copy, discarding any local edits)

```ts
const entry = status.entries[0];
const firstLabel = !entry.deployed
  ? `Apply: ${entry.title}`
  : entry.inSync
    ? `[ON] Keep: ${entry.title}`
    : `[UPDATE] Apply latest: ${entry.title}`;
const firstDescription = !entry.deployed
  ? entry.description
  : entry.inSync
    ? `<translate \`[Now applied — unchecked items are removed]\` to [filid:lang]> ${entry.description}`
    : `<translate \`[Local edits will be overwritten]\` to [filid:lang]> ${entry.description}`;
const secondLabel = entry.deployed
  ? `Remove: ${entry.title}`
  : `Skip: ${entry.title}`;

AskUserQuestion({
  questions: [
    {
      question: "<translate `Apply rule doc \"${entry.title}\"?` to [filid:lang]>",
      multiSelect: false,
      header: "Rule docs",
      options: [
        { label: firstLabel, description: firstDescription },
        {
          label: secondLabel,
          description: "<translate `Do not apply this rule doc.` to [filid:lang]>",
        },
      ],
    },
  ],
});
```

Map the user's answer to `nextSelection`:

- First option chosen → `nextSelection[entry.id] = true`
- Second option chosen → `nextSelection[entry.id] = false`

`[ON]` and `[UPDATE]` are literal English tokens marking the current state —
do NOT translate either. See [Post-processing](#post-processing--resyncids-derivation)
below for how `[UPDATE]` entries feed the Phase 0d `resync` list.

### Case C — `N >= 2` (two or more optional rules)

Render a **multi-select checkbox prompt** with exactly one option per
optional entry. Three label states are possible:

- `!deployed` → `${entry.title}` (no prefix)
- `deployed && inSync` → `[ON] ${entry.title}`
- `deployed && !inSync` → `[UPDATE] ${entry.title}` (plugin template differs
  from the deployed copy; re-checking means "keep AND accept the newer
  template", overwriting any local edits)

```ts
function labelFor(entry) {
  if (!entry.deployed) return entry.title;
  return entry.inSync ? `[ON] ${entry.title}` : `[UPDATE] ${entry.title}`;
}
function descriptionFor(entry) {
  if (!entry.deployed) return entry.description;
  if (entry.inSync)
    return `<translate \`[Now applied — unchecked items are removed]\` to [filid:lang]> ${entry.description}`;
  return `<translate \`[Local edits will be overwritten]\` to [filid:lang]> ${entry.description}`;
}

AskUserQuestion({
  questions: [
    {
      question: "<translate the header below to [filid:lang]>",
      multiSelect: true,
      header: "Rule docs",
      options: status.entries.map((entry) => ({
        label: labelFor(entry),
        description: descriptionFor(entry),
      })),
    },
  ],
});
```

**Header** (English default; translate surrounding text but keep `[ON]` and
`[UPDATE]` untranslated):
`"Select rule docs to apply. **Re-check [ON] items to keep them applied — unchecked [ON] items will be removed.** Items prefixed with '[UPDATE]' have a newer plugin template — re-checking accepts the update and overwrites the deployed file."`

**Hard rules**:

1. `multiSelect: true` is MANDATORY in Case C.
2. Exactly ONE option per optional entry — NEVER pair an entry with a
   "keep"/"remove" companion option.
3. Required rules MUST NOT appear as options.
4. `[ON]` and `[UPDATE]` are the ONLY allowed bracketed prefixes; do NOT
   add `[V]` / `[ ]` / `[X]` / `[✓]` markers — they collide with the UI's
   own checkbox column. Both tokens are literal English — do NOT translate.

Map the user's answer to `nextSelection`:

- For every `entry` in `status.entries`, set
  `nextSelection[entry.id] = userAnswer.some((label) => label.includes(entry.title))`.
- `AskUserQuestion` returns only the labels the user checked, so any
  entry whose title is NOT found in the answer list is `false`.

### Post-processing — `resyncIds` derivation

Always proceed to Phase 0d with the computed `nextSelection`. The sync
handler is idempotent — calling it when nothing changes is cheap and
guarantees required rules stay applied.

Before calling Phase 0d, derive `resyncIds` from the drift signal carried
by `status.entries`: every optional rule that was drifted AND is kept on
by the user becomes a resync target. Required rules are NEVER included —
the sync handler auto-resyncs them.

```ts
const resyncIds = status.entries
  .filter((e) => e.deployed && !e.inSync && nextSelection[e.id] === true)
  .map((e) => e.id);
```

`resyncIds` MAY be empty and that is the common case.

## Phase 0d — Rule Docs Sync

Call `mcp_t_rule_docs_sync` with `action: "sync"`, the computed selection,
and the `resync` array from Phase 0c:

```
mcp_t_rule_docs_sync({
  action: "sync",
  path: "<target-path>",
  selections: { "filid_fca-policy": true, "filid_reuse-first": false },
  resync: ["filid_reuse-first"]
})
```

`selections` MUST be passed as a raw object map (`Record<string, boolean>`),
not as a JSON string. For example, use
`selections: { "filid_fca-policy": true, "filid_reuse-first": false }`, NOT
`selections: "{\"filid_fca-policy\":true,\"filid_reuse-first\":false}"`.

`resync` MUST be passed as a raw string array (or omitted / `null` when
there is nothing to resync). Unknown ids are silently rejected by the
handler and recorded in `result.skipped`.

The handler copies/removes/updates files under `.claude/rules/` to match
the requested selection. No rule doc state is stored in `.filid/config.json`
— the filesystem is authoritative. Required rules that show drift are
overwritten unconditionally, regardless of whether they appear in `resync`.

Inspect `result.copied`, `result.removed`, `result.updated`, `result.drift`,
`result.unchanged`, `result.skipped` and surface a one-line summary to the
user (English default; translate to `[filid:lang]` at runtime, e.g.,
`"Rule docs: copied=1, updated=1, removed=0, drift=0, unchanged=0"`).

When `result.drift` is non-empty, append TWO hint lines (translate each to
`[filid:lang]`):

- Line 1 (status): `"Drift detected: ${result.drift.join(', ')}"`
- Line 2 (action): `"→ Accept template update: re-run /filid:filid-setup --rules and re-check [UPDATE] items. Keep local edits: ignore."`

If `result.skipped` is non-empty, print each `{ id, reason }` as a
warning but DO NOT abort — continue with the remaining phases.

> **Note**: `.filid/config.json` and applied `.claude/rules/*.md` files
> should be committed to version control. `.filid/review/` and
> `.filid/cache/` should be gitignored (transient data).

**→ If the invocation passed `--rules`, STOP here and emit a short
completion line (English default; translate to `[filid:lang]` at runtime,
e.g., `"Rule docs updated — Phase 1–5 skipped"`). Otherwise immediately
proceed to Phase 1.**

## Re-entry Behaviour

`/filid:filid-setup` is safe to run repeatedly. On a second or later
invocation in the same project:

- Phase 0a is a no-op (config already exists)
- Phase 0b returns `selected` derived from the filesystem
  (`required || deployed`) and populates `templateHash`/`deployedHash`/`inSync`
  for every optional entry so template drift surfaces in the UI
- Phase 0c dispatches on `status.entries.length`:
  - `N === 0`: no prompt, `nextSelection = {}`.
  - `N === 1`: single-select Yes/No with three label states (`!deployed` /
    `[ON]` / `[UPDATE]`).
  - `N >= 2`: multi-select checkbox with `[ON]` / `[UPDATE]` state markers.

  `AskUserQuestion` cannot pre-check boxes, so in Case C the user MUST
  re-select every optional rule doc they want to keep — omitting an
  `[ON]` item causes it to be removed in Phase 0d.
- Phase 0d applies the diff (add newly-checked, remove newly-unchecked,
  resync drifted-and-still-checked). Required rules that show drift are
  always overwritten.

This makes the skill the **single management entry point** for optional
rule doc toggling.

## Rules-only Mode (`--rules`)

When the user passes `--rules`, the skill runs Phase 0a → Phase 0d and
then stops. This is useful when:

- The user wants to enable/disable an optional rule doc without
  triggering a full project scan
- A project is already initialised and only the rule doc selection has
  drifted from the user's intent
- The plugin shipped a new template and the user wants to accept the
  `[UPDATE]` on deployed rules without regenerating INTENT.md/DETAIL.md
- CI or a script needs a fast, idempotent path to reconcile
  `.claude/rules/` with the manifest

The skill prints a short completion line after Phase 0d in this mode and
emits nothing from Phase 1–5. All interactive behaviour in Phase 0c is
preserved — the user still confirms selections via the checkbox UI.

## Gitignore Recommendation

If `.filid/review/` or `.filid/cache/` are not in `.gitignore`, inform the user:

```
[INFO] Consider adding to .gitignore:
  .filid/review/
  .filid/cache/
```

`.filid/config.json` and every applied `.claude/rules/*.md` file
should be committed to version control.
