# filid-setup — Reference Documentation

Detailed workflow, templates, and rules for the FCA-AI initialization skill.
For the quick-start guide, see [SKILL.md](./SKILL.md).

## Section 0 — Environment Setup Details

Section 0 is split into four sub-phases. Phase 0a creates the config,
Phase 0b inspects current rule doc state, Phase 0c asks the user which
rule docs to deploy (the ONLY interactive checkpoint in this skill), and
Phase 0d persists the decision and synchronises `.claude/rules/`.

### Phase 0a — Config Initialization

Call `project_init({ path })`. The handler:
- Resolves the git repository root from `path`
- Creates `.filid/config.json` if absent, with the default 8-rule config
- Never overwrites an existing config

`project_init` does NOT touch `.claude/rules/` in any way. Rule doc state
is tracked on the filesystem only (`.claude/rules/*.md`), never mirrored
into `.filid/config.json`.

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

### Phase 0b — Rule Docs Status Query

Call `rule_docs_sync({ action: "status", path })`. Response shape:

```ts
{
  action: "status";
  status: {
    pluginRootResolved: boolean;
    manifestPath: string | null;
    /** Optional rules ONLY — the checkbox-facing list. */
    entries: Array<{
      id: string;
      filename: string;      // e.g. "rfx.md"
      required: false;       // always false for this list
      title: string;         // checkbox label
      description: string;   // checkbox description
      deployed: boolean;     // file currently exists under .claude/rules/
      selected: boolean;     // === deployed for optional rules
    }>;
    /**
     * Required rules — auto-synced regardless of user input. NEVER
     * rendered in the checkbox UI; surfaced here only so the skill can
     * list them in the Phase 0d summary.
     */
    autoDeployed: Array<{
      id: string;
      filename: string;
      required: true;
      title: string;
      description: string;
      deployed: boolean;
      selected: true;
    }>;
  };
}
```

If `pluginRootResolved` is `false`, fail fast: the plugin is running
without `CLAUDE_PLUGIN_ROOT` set, which means `rule_docs_sync` cannot
locate the manifest. Surface an error message and skip Phase 0c/0d.

Build `currentSelection: Record<string, boolean>` by mapping each entry
from `status.entries` (optional only) to `entry.selected`. Do NOT
include any required entries — they are enforced server-side and must
not appear in the UI.

### Phase 0c — Checkbox Prompt <!-- [INTERACTIVE] -->

Use `AskUserQuestion` to render a multi-select question listing only
the optional rules in `status.entries`. Required rules from
`status.autoDeployed` MUST NOT appear as options — they are already
enforced by the sync handler and the user cannot opt out.

**Note**: `AskUserQuestion` does not support pre-checking or default
selection. To represent the current deployment state (from Phase 0b
`entry.deployed`), you MUST prepend a literal `[ON] ` prefix (note the
trailing space) to each deployed option's `label`. Do NOT use a
`[V]` / `[ ]` / `[X]` / `[✓]` checkbox-style prefix — it collides with
the UI's own checkbox column.

- **Header** (English default; translate to `[filid:lang]` at runtime):
  `"Select rule docs to deploy. Items prefixed with '[ON]' will be REMOVED if you do not re-check them."`
- **Options**: one per entry in `status.entries` (optional rules only).
  - Label — prepend `[ON] ` when `entry.deployed === true`; otherwise
    use the bare `title`. The `[ON]` marker is a literal English token
    — do NOT translate it, so the `title` portion remains stable for
    later matching:
    - `deployed === true` → `"[ON] title"`
    - `deployed === false` → `"title"`
  - Description: `entry.description`
  - `[ON]` is the ONLY allowed bracketed prefix; do NOT add `[V]` / `[ ]`
    / `[X]` / `[✓]` checkbox-style markers. `AskUserQuestion` renders
    its own checkbox column, and a checkbox-style prefix is visually
    indistinguishable from the real checkbox — users cannot tell which
    one is authoritative.
  - Because `AskUserQuestion` cannot pre-check options, the `[ON]`
    prefix is the ONLY cue for current state. The user MUST re-select
    every option they want to keep deployed; an optional entry left
    unchecked will be removed in Phase 0d.

After the user answers, map the labels back to rule `id`s:

```ts
const nextSelection: Record<string, boolean> = {};
// Iterate optional entries only — required rules are enforced by
// `syncRuleDocs` from the manifest and must not appear in the map.
for (const entry of status.entries) {
  // AskUserQuestion returns labels only for items the user checked.
  // Match back to the entry by substring on the stable `title` portion
  // (the literal `[ON] ` prefix does not disturb the match because
  // `entry.title` is a substring of the label).
  nextSelection[entry.id] = userAnswer.some((answerLabel) =>
    answerLabel.includes(entry.title),
  );
}
```

If `nextSelection` is deep-equal to `currentSelection` AND every entry
in `status.autoDeployed` already has `deployed === true`, skip Phase 0d
and proceed to Phase 1.

### Phase 0d — Sync

Call `rule_docs_sync({ action: "sync", path, selections: nextSelection })`.
`selections` MUST be a raw object map, not a JSON string.
Response shape:

```ts
{
  action: "sync";
  selections: Record<string, boolean>;
  result: {
    copied: string[];     // filenames that were freshly deployed
    removed: string[];    // filenames that were unlinked
    unchanged: string[];  // filenames that matched the desired state already
    skipped: Array<{ id: string; reason: string }>;
  };
}
```

Valid call shape:

```ts
rule_docs_sync({
  action: "sync",
  path,
  selections: { fca: true, rfx: false },
});
```

Do NOT stringify the map. This is invalid and will trigger MCP input
validation unless the handler explicitly recovers it:

```ts
rule_docs_sync({
  action: "sync",
  path,
  selections: '{"fca":true,"rfx":false}',
});
```

The handler walks the manifest and performs the filesystem diff under
`.claude/rules/`. No rule doc state is stored in `.filid/config.json`.

Existing rule doc files are never overwritten — if a user edited
`.claude/rules/fca.md` locally, re-running the skill with `fca` still
selected will leave their edits untouched.

Print a one-line summary (English default; translate to `[filid:lang]` at runtime):
```
Rule docs synced: copied=<n>, removed=<n>, unchanged=<n>, skipped=<n>
```

If `skipped` is non-empty, print each entry as a warning line but do
NOT abort — continue with Phase 1.

### Step: Gitignore Recommendation

If `.filid/review/` or `.filid/cache/` are not in `.gitignore`, inform the user:

```
[INFO] Consider adding to .gitignore:
  .filid/review/
  .filid/cache/
```

`.filid/config.json` and every deployed `.claude/rules/*.md` file
should be committed to version control.

### Re-entry Behaviour

`/filid:filid-setup` is safe to run repeatedly. On a second or later
invocation in the same project:
- Phase 0a is a no-op (config already exists)
- Phase 0b returns `selected` derived from the filesystem
  (`required || deployed`)
- Phase 0c surfaces the current filesystem state via a literal `[ON] `
  label prefix on already-deployed items. `AskUserQuestion` itself
  cannot pre-check boxes, so the user MUST re-select every optional
  rule doc they want to keep — omitting an `[ON]` item causes it to
  be removed in Phase 0d.
- Phase 0d applies only the diff (add newly-checked, remove newly-unchecked)

This makes the skill the **single management entry point** for optional
rule doc toggling.

### Rules-only Mode (`--rules`)

When the user passes `--rules`, the skill runs Phase 0a → Phase 0d and
then stops. This is useful when:
- The user wants to enable/disable an optional rule doc without
  triggering a full project scan
- A project is already initialised and only the rule doc selection has
  drifted from the user's intent
- CI or a script needs a fast, idempotent path to reconcile
  `.claude/rules/` with the manifest

The skill prints a short completion line after Phase 0d in this mode and
emits nothing from Phase 1–5. All interactive behaviour in Phase 0c is
preserved — the user still confirms selections via the checkbox UI.

---

## Section 1 — Directory Scan Details

Call `fractal_scan` to retrieve the complete project hierarchy by scanning the filesystem.

```
fractal_scan({ path: "<target-path>" })
```

The response is a `ScanReport` containing:
- `tree.nodes`: Map of path → FractalNode (with `name`, `path`, `type`, `hasIntentMd`, `hasDetailMd`, `children`)
- `tree.nodesList`: flat array of all FractalNode objects (for convenient iteration)
- `tree.root`: root directory path
- `modules`: optional ModuleInfo list (empty unless `includeModuleInfo: true`)

> **Important — `tree.nodes` is an object (dict) in JSON, NOT an array.**
> Use `tree.nodesList` for safe array iteration. Use `tree.nodes["/path"]` for path-based lookup.

Build an internal working list of all directories from `tree.nodesList` (or `tree.nodes`) for Phase 2 classification.

> **Note**: Do NOT use `fractal_navigate(action: "tree")` for scanning — that tool
> builds a tree only from a pre-supplied `entries` array and does not read the filesystem.

> **Important**: `tree.nodes` in the `fractal_scan` response contains **all**
> directories, including those nested inside organ nodes. In Phase 2, always
> iterate over the full `tree.nodes.values()`. Traversing only `children` from
> `tree.root` will miss fractal nodes that live inside organ boundaries.

## Section 2 — Node Classification Rules

For each directory, call `fractal_navigate` with `action: "classify"`:

```
fractal_navigate({
  action: "classify",
  path: "<directory-path>",
  entries: [/* child entries from tree */]
})
```

Apply the following decision logic in order:

| Condition                               | Node Type     | Action                                  |
| --------------------------------------- | ------------- | --------------------------------------- |
| `hasIntentMd === true`                  | fractal       | Preserve existing file, skip generation |
| `hasDetailMd === true`                  | fractal       | Preserve existing file, skip generation |
| Directory name in `KNOWN_ORGAN_DIR_NAMES` | organ       | Skip — INTENT.md is prohibited          |
| No fractal children + leaf directory    | organ         | Skip — INTENT.md is prohibited          |
| No observable side effects, stateless   | pure-function | No INTENT.md needed                     |
| Default (none of the above)             | fractal       | Generate INTENT.md                      |

`KNOWN_ORGAN_DIR_NAMES` (name-based, always organ regardless of structure):

- **UI/shared**: `components`, `utils`, `types`, `hooks`, `helpers`, `lib`, `styles`, `assets`, `constants`
- **Test/infra**: `__tests__`, `__mocks__`, `__fixtures__`, `test`, `tests`, `spec`, `specs`, `fixtures`, `e2e`

Pattern-based organ rules (applied before name list, after INTENT.md/DETAIL.md check):

| Pattern | Example | Classification |
| ------- | ------- | -------------- |
| `__name__` (double-underscore wrapped) | `__tests__`, `__mocks__`, `__custom__` | organ |
| `.name` (dot-prefixed) | `.git`, `.github`, `.vscode`, `.claude` | organ |

> **Important**: Pattern rules apply regardless of directory structure (leaf or
> not). An explicit INTENT.md always takes precedence over pattern matching.

### Deep Scan — Fractal Nodes Inside Organ Directories

Organ nodes are never INTENT.md targets, but fractal nodes can exist inside
them. Phase 2 must handle this by scanning the full `tree.nodes` map.

**Core rules**:
- Organ node itself → skip INTENT.md generation, but continue scanning inside
- Fractal node inside an organ → eligible for INTENT.md generation
- Organ node inside an organ → skip INTENT.md generation, continue scanning

**Traversal algorithm** (iterate `tree.nodes` directly):

```
for each node in tree.nodes.values():
  if node.type === 'fractal' or 'pure-function':
    → include as a classification target (even if located inside an organ)
  if node.type === 'organ':
    → skip INTENT.md generation; sub-nodes are handled by the same loop
```

**Example — three levels of organ nesting**:

```
/app/src (fractal)                                      ← INTENT.md target
  /app/src/components (organ)                           ← skip
    /app/src/components/location (fractal, reclassified) ← INTENT.md target ✓
      /app/src/components/location/FindLocationModal
        (fractal)                                        ← INTENT.md target ✓
```

> `location` is not in `KNOWN_ORGAN_DIR_NAMES` and has a fractal child, so the
> post-correction pass in `scanProject()` automatically reclassifies it as
> fractal and places it in `components.children[]`.

## Section 3 — INTENT.md Generation Template

For each directory classified as fractal that does not yet have a INTENT.md,
generate one using the context-manager agent.

INTENT.md structure (hard limit: 50 lines):

```markdown
# <Module Name>

## Purpose

<1–2 sentence description of what this module does>

## Structure

<key files and sub-directories with one-line descriptions>

## Conventions

<language, patterns, naming rules specific to this module>

## Boundaries

### Always do

- <rule 1>
- <rule 2>

### Ask first

- <action that requires user confirmation before proceeding>

### Never do

- <prohibited action 1>
- <prohibited action 2>

## Dependencies

<list of modules this directory depends on>
```

**Language**: Section headings (`## Purpose`, `## Structure`, `## Conventions`, `## Boundaries`, `### Always do`, `### Ask first`, `### Never do`, `## Dependencies`) MUST remain in English. All content text MUST be written in the language specified by the `[filid:lang]` tag. If no tag is present, follow the system's language setting; default to English.

Enforce: file must not exceed 50 lines. If generation would exceed the
limit, summarize the most important conventions and boundary rules.

## Section 4 — DETAIL.md Scaffolding

For fractal modules that expose a public API and lack a DETAIL.md, generate
a scaffold:

```markdown
# <Module Name> Specification

## Requirements

- <functional requirement>

## API Contracts

- <function signature and expected behaviour>

## Last Updated

<ISO date>
```

**Language**: Section headings (`## Requirements`, `## API Contracts`, `## Last Updated`) MUST remain in English. Content follows the language specified by the `[filid:lang]` tag. If no tag is present, follow the system's language setting; default to English.

Only create DETAIL.md when the module clearly has an API surface worth
specifying. Do not create DETAIL.md for leaf utility directories.

## Section 5 — Validation and Report Format

After all files are written, validate the resulting structure:

- Each fractal node's INTENT.md passes `validateIntentMd()` (≤ 50 lines,
  3-tier boundary sections present)
- No organ directory contains a INTENT.md
- All DETAIL.md files pass `validateDetailMd()`

Print a summary report:

```
FCA-AI Init Report
==================
Directories scanned : <n>
Fractal nodes       : <n>
Organ nodes         : <n>
Pure-function nodes : <n>
INTENT.md created   : <n>
DETAIL.md created     : <n>
Warnings            : <list or "none">
```
