---
name: setup-lens
user_invocable: true
description: Initialize and manage .maencof-lens/config.json for read-only vault access configuration. Supports vault registration, removal, default vault switching, and layer filter management through interactive setup or direct subcommands. Run this first before using lookup or context skills.
version: 1.1.0
complexity: simple
plugin: maencof-lens
---

> **EXECUTION MODEL**: Single continuous operation — read, apply, validate, report in one turn.

# setup-lens — Lens Configuration Manager

Manage `.maencof-lens/config.json` for read-only vault access.

## Subcommands

### `init` (default)

Interactive setup: ask vault path + name → create config with default layers `[2, 3, 4, 5]`.
If config exists: show current config, ask to overwrite.

### `show`

Display current config as formatted table: name, path, layers, default status.

### `add <name> <path>`

Add vault to config. Validates: name is unique, path exists, has `.maencof/index.json`.

### `remove <name>`

Remove vault by name. If removed vault was default, first remaining becomes default.

### `set-default <name>`

Change the default vault.

### `set-layers <name> <layers>`

Update layer filter for a vault. Example: `set-layers personal 2,3,4,5`

## Workflow

### Step 1 — Resolve Config Path

Config location: `<cwd>/.maencof-lens/config.json`

- `init`: if config exists → show current + ask to overwrite
- Mutations (`add`/`remove`/`set-default`/`set-layers`): load → validate → mutate → write → read-back verify

### Step 2 — Execute Subcommand

**`init`**:
1. Ask user for vault name and absolute path
2. Validate vault path exists and contains `.maencof/index.json`
3. Create config with default layers `[2, 3, 4, 5]`
4. Write `.maencof-lens/config.json`

**`add`**:
1. Load existing config (error if missing — run `init` first)
2. Validate vault name is unique and path exists with `.maencof/index.json`
3. Append vault entry with default layers `[2, 3, 4, 5]`
4. Write back

**`remove`**:
1. Load config, find vault by name (error if not found)
2. Remove vault entry
3. If removed vault was default → mark first remaining as default
4. Write back

**`show`**:
1. Read `.maencof-lens/config.json` (error if missing)
2. Display formatted table: name, path, layers, default status

### Step 3 — Validation

After any mutation, read the file back and verify valid JSON structure.

## Config Schema

```json
{
  "version": "1.0",
  "vaults": [{
    "name": "personal",
    "path": "/abs/path/to/vault",
    "layers": [2, 3, 4, 5],
    "default": true
  }]
}
```

## Examples

```
/maencof-lens:setup-lens init
/maencof-lens:setup-lens show
/maencof-lens:setup-lens add work /Users/me/work-vault
/maencof-lens:setup-lens set-default work
/maencof-lens:setup-lens set-layers work 3,4
/maencof-lens:setup-lens remove work
```
