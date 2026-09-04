# filid Rule Docs Templates

This directory ships rule documentation templates that the `/filid:setup` skill deploys into a target project's `.claude/rules/` directory.

> **Important — deployment is skill-only.** SessionStart hooks do NOT copy or remove these files. The only code path that writes to `.claude/rules/` is `syncRuleDocs()` in `src/core/infra/configLoader/loaders/syncRuleDocs.ts`, which is invoked exclusively by the `mcp__plugin_filid_tools__project_setup` `rules-sync` action from the `setup` skill after the user confirms a checkbox selection.

## manifest.json

`manifest.json` is the single source of truth for which rule docs exist and which are required. filid ships four, all required — the rules are not partially adoptable, so there is currently no `required: false` entry:

```json
{
  "_comment": "...",
  "version": "1.0",
  "rules": [
    {
      "id": "filid_fractal-boundaries",
      "filename": "filid_fractal-boundaries.md",
      "required": true,
      "title": "Fractal Boundaries",
      "description": "...",
      "grounding": "This rule rests on properties every codebase has: ...",
      "templateHash": "<injected by scripts/syncRuleHashes.mjs>"
    }
  ]
}
```

The four documents are `filid_fractal-boundaries.md`, `filid_module-documents.md`, `filid_verification-records.md` and `filid_code-placement.md`. The middle two carry a `paths:` frontmatter block so the harness loads them only while a matching file is open; use `paths:`, never `globs:` — an unknown key is dropped and the rule silently becomes standing context.

A document dropped from the manifest needs no migration entry: the shared rule manager retires any `filid_*.md` in the rules directory that the manifest no longer names.

Fields:

| Field            | Meaning                                                                                                                                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`             | Stable identifier for the rule doc (used in logs and the sync response)                                                                                                                                         |
| `filename`       | Source file (under `templates/rules/`) and destination basename (under `.claude/rules/`)                                                                                                                        |
| `required`       | `true` → always deployed and auto-resynced on drift; never rendered as a checkbox. `false` → opt-in (pre-checked iff already deployed), and drift is preserved unless the caller passes an explicit `resync` id |
| `legacyFilename` | Optional. A previous address for this same document, migrated on the next sync. Filenames and legacy filenames must be globally unique across entries — two entries claiming one name fails the sync            |
| `title`          | Short label shown in the `setup` checkbox UI                                                                                                                                                                    |
| `description`    | One-line summary shown underneath the checkbox                                                                                                                                                                  |
| `grounding`      | Authoring-time admission rationale: the universal property the rule rests on. Required by the invariant test and never rendered into the deployed document                                                    |
| `templateHash`   | SHA-256 of the template bytes, injected by `scripts/syncRuleHashes.mjs`. Never hand-write it                                                                                                                    |

## Adding a new rule doc

1. Write the markdown under `templates/rules/<your-rule>.md`, following the shape the existing four use: a one-line header blockquote that opens with `> **Precedence**:` and carries the Applies-when scope, numbered sections of dense imperative prose, and a closing one-line "This rule is working if: / is wrong for you if:" pair.
2. Append an entry to `manifest.json`, including a `grounding` sentence that names the universal property admitting the rule. This rationale is checked at authoring time and is not deployed. Use `required: false` if the rule should be opt-in via the checkbox; filid's own four are all `required: true`. `src/__tests__/unit/core/ruleDocInvariants.test.ts` enforces the manifest grounding, deployed skeleton, and `paths:` frontmatter contract.
3. Run `yarn build:rules` to inject `templateHash`. The repo-root `.prettierignore` and `.gitattributes` keep these files byte-stable (no reformatting, LF endings) — that is what makes the hash deterministic, so do not reformat them by hand.
4. Rebuild the plugin (`yarn build:plugin`) so the bundled MCP server picks up the new handler context.
5. Run `/filid:setup` on a test project — an optional rule appears in the checkbox list, pre-unchecked; a required rule is auto-deployed and reported in the summary instead.
6. If the rule is selected, the file is copied to `.claude/rules/<filename>`. If later unselected on a re-run of the skill, the file is removed.
