# filid Rule Docs Templates

This directory ships rule documentation templates that the `/filid:filid-setup`
skill deploys into a target project's `.claude/rules/` directory.

> **Important — deployment is skill-only.** SessionStart hooks do NOT copy or
> remove these files. The only code path that writes to `.claude/rules/` is
> `syncRuleDocs()` in `src/core/infra/config-loader/config-loader.ts`, which
> is invoked exclusively by the `mcp_t_rule_docs_sync` MCP tool from the
> `filid-setup` skill after the user confirms a checkbox selection.

## manifest.json

`manifest.json` is the single source of truth for which rule docs exist and
which are required:

```json
{
  "_comment": "...",
  "version": "1.0",
  "rules": [
    {
      "id": "fca",
      "filename": "fca.md",
      "required": true,
      "title": "FCA-AI Architecture Rules",
      "description": "..."
    }
  ]
}
```

Fields:

| Field | Meaning |
|---|---|
| `id` | Stable identifier for the rule doc (used in logs and the sync response) |
| `filename` | Source file (under `templates/rules/`) and destination basename (under `.claude/rules/`) |
| `required` | `true` → always deployed, UI pre-checks and disables the checkbox. `false` → opt-in (pre-checked iff already deployed) |
| `title` | Short label shown in the `filid-setup` checkbox UI |
| `description` | One-line summary shown underneath the checkbox |

## Adding a new rule doc

1. Write the markdown under `templates/rules/<your-rule>.md`.
2. Append an entry to `manifest.json` with `required: false` so the user can
   opt in via the checkbox.
3. Rebuild the plugin (`yarn build:plugin`) so the bundled MCP server picks
   up the new handler context.
4. Run `/filid:filid-setup` on a test project — the new rule should appear
   in the checkbox list, pre-unchecked.
5. If the rule is selected, the file is copied to `.claude/rules/<filename>`.
   If later unselected on a re-run of the skill, the file is removed.
