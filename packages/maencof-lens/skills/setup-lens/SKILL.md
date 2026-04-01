---
name: setup-lens
user_invocable: true
description: Initialize and manage .maencof-lens/config.json for read-only vault access configuration. Supports vault registration, removal, default vault switching, and layer filter management through interactive setup or direct subcommands. Run this first before using lookup or context skills.
version: 1.1.0
complexity: simple
plugin: maencof-lens
---

> **EXECUTION MODEL**: Execute as SINGLE CONTINUOUS OPERATION.
> Read config, apply changes, validate, and report — all in one turn.

# setup-lens — Lens Configuration Manager

Set up and manage `.maencof-lens/config.json` for read-only vault access.

## When to Use This Skill

- First-time setup: `/maencof-lens:setup-lens init`
- Adding a vault: `/maencof-lens:setup-lens add personal /path/to/vault`
- Checking current config: `/maencof-lens:setup-lens show`
- Changing default vault: `/maencof-lens:setup-lens set-default work`

## Subcommands

### `init` (default)

Interactive setup: ask for vault path + name, create config.

### `show`

Display current config in a formatted table.

### `add <name> <path>`

Add a vault to existing config. Validates path exists.

### `remove <name>`

Remove a vault. Adjusts default if the removed vault was default.

### `set-default <name>`

Change the default vault.

### `set-layers <name> <layers>`

Update layer filter for a vault. Example: `set-layers personal 2,3,4,5`

## Core Workflow

### Step 1 — Resolve Config Path

1. Config path: `<cwd>/.maencof-lens/config.json`
2. For `init`: if config exists, show current + ask to overwrite
3. For mutations: load → validate → mutate → write → read-back verify

### Step 2 — Execute Subcommand

**For `init`**:
1. Ask user for vault name and absolute path
2. Validate vault path exists and has `.maencof/index.json`
3. Create config with default layers `[2, 3, 4, 5]`
4. Write `.maencof-lens/config.json`

**For `add`**:
1. Load existing config (create default if missing)
2. Validate vault name is unique and path exists
3. Append vault entry
4. Write back

**For `remove`**:
1. Load config, find vault by name
2. Remove vault entry
3. If removed vault was default, mark first remaining as default
4. Write back

**For `show`**:
1. Read `.maencof-lens/config.json`
2. Display formatted table: name, path, layers, default status

### Step 3 — Validation

After any mutation, read the file back and verify valid JSON.

## Examples

```
/maencof-lens:setup-lens init
/maencof-lens:setup-lens show
/maencof-lens:setup-lens add work /Users/me/work-vault
/maencof-lens:setup-lens set-default work
/maencof-lens:setup-lens set-layers work 3,4
/maencof-lens:setup-lens remove work
```
