---
name: setup
user-invocable: true
disable-model-invocation: true
description: "Initialize and manage .maencof-lens/config.json — register vaults, switch the default, and set layer filters for read-only access."
argument-hint: "[init|show|add NAME PATH|set-default NAME|set-layers NAME LAYERS|remove NAME]"
version: 1.1.0
complexity: simple
plugin: maencof-lens
---

> **EXECUTION MODEL**: Single continuous operation — read, apply, validate, report in one turn.

# setup — Lens Configuration Manager

Manage `.maencof-lens/config.json` for read-only vault access.

## Subcommands

### `init` (default)

Interactive setup: ask vault path + name → create config with default layers `[2, 3, 4, 5]`. If config exists: show current config, ask to overwrite.

### `show`

Display current config as formatted table: name, path, layers, default status.

### `add <name> <path>`

Add vault to config. Validates: name is unique and the vault passes the index check below.

## Vault Index Check

Require an existing vault directory and these regular files under its `.maencof/` directory:

- `graph-meta.json` — the committed sharded index marker
- `nodes.json` — serialized graph nodes
- `edges.json` — serialized graph edges

Current maencof builds remove the legacy `index.json`; its absence is expected and must not block registration. `archive-members.json` is optional and must not be required.

If any required file is missing, do not write config. Report the missing files and ask the user to run `kg_build` in a maencof session, then retry setup. A legacy `index.json` alone is not sufficient: lens must not build or migrate a vault index.

This is a file-presence check; actual index parsing and schema validation belong to the MCP graph loader. If a later tool call reports an unreadable index, guide the user to rebuild it in a maencof session.

### `remove <name>`

Remove vault by name. If removed vault was default, first remaining becomes default.

### `set-default <name>`

Change the default vault.

### `set-layers <name> <layers>`

Update layer filter for a vault. Example: `set-layers personal 2,3,4,5`

## Workflow

### Step 1 — Resolve Config Path

Default config location: `<cwd>/.maencof-lens/config.json`. If the user explicitly selects an outside config root (including `MAENCOF_LENS_CONFIG_ROOT`) or the user layer, resolve that selected destination instead and use it for every read and write in this workflow. Never select a different root or layer automatically.

- `init`: if config exists → show current + ask to overwrite
- Mutations (`add`/`remove`/`set-default`/`set-layers`): load → validate → mutate → write → read-back verify

### Before Every Write — Vault Boundary Check

This skill writes with the agent's file tools, so it must enforce the same vault boundary as `writeConfig` before any config or `.gitignore` write:

1. Read the registered vault roots from both existing user and project config layers, and include the roots in the proposed config. Check all of them even when the project list overrides the user list or a mutation removes a vault.
2. Check the working folder and the actual config destination separately against every registered vault root. Resolve relative vault paths against the process working folder, as the vault readers do; compare whole path components after resolving dot segments and filesystem aliases, including symbolic links and existing ancestors of a missing destination.
3. Never create config directories, write config, or update `.gitignore` inside a vault working folder. If the default or explicitly selected config destination is inside a registered vault, stop before writing and show: "Cannot save lens settings inside a registered vault. Set MAENCOF_LENS_CONFIG_ROOT to a folder outside the vault, or save to the user layer."
4. Never switch config roots or layers automatically. If the user explicitly chooses an outside config root or the user layer, check that destination against every registered vault and allow the save when it is safe, even if the working folder remains inside a vault. Write only at the selected outside destination and skip the in-vault `.gitignore` update.

### Step 2 — Execute Subcommand

**`init`**:

1. Ask user for vault name and absolute path
2. Validate the absolute vault path using the Vault Index Check above
3. Create config with default layers `[2, 3, 4, 5]`
4. Write config to the selected destination after the Vault Boundary Check
5. Run `.gitignore` guard (see Step 3)

**`add`**:

1. Load existing config (error if missing — run `init` first)
2. Validate vault name is unique and the absolute vault path passes the Vault Index Check above
3. Append vault entry with default layers `[2, 3, 4, 5]`
4. Write back
5. Run `.gitignore` guard (see Step 3)

**`remove`**:

1. Load config, find vault by name (error if not found)
2. Remove vault entry
3. If removed vault was default → mark first remaining as default
4. Write back

**`show`**:

1. Read config from the selected destination (error if missing)
2. Display formatted table: name, path, layers, default status

### Step 3 — `.gitignore` Guard

After `init` or `add` creates/modifies config, ensure `.maencof-lens` is git-ignored:

Skip this entire step when the working folder is inside a registered vault, including after a successful save to an explicitly selected outside destination. Also skip it when the config destination is not `<cwd>/.maencof-lens/config.json`; this guard manages only the working folder's project config.

1. Check if `<cwd>` is a git repository (`<cwd>/.git` exists)
   - If NOT a git repo → skip this step entirely
2. Run `git check-ignore -q .maencof-lens` to test if git already ignores the path (via local `.gitignore`, global gitignore, or `.git/info/exclude`)
   - If exit code 0 (already ignored) → skip this step entirely
3. Read `<cwd>/.gitignore` (create if missing)
4. Check if `.maencof-lens` or `.maencof-lens/` already appears as a line
   - If already present → skip (no duplicate)
5. Append `.maencof-lens/` to `.gitignore`

This step is skipped for `remove`, `set-default`, `set-layers`, and `show` subcommands.

### Step 4 — Validation

After any mutation, read the file back and verify valid JSON structure.

## Config Schema

```json
{
  "version": "1.0",
  "vaults": [
    {
      "name": "personal",
      "path": "/abs/path/to/vault",
      "layers": [2, 3, 4, 5],
      "default": true
    }
  ]
}
```

## Examples

```
/maencof-lens:setup init
/maencof-lens:setup show
/maencof-lens:setup add work /Users/me/work-vault
/maencof-lens:setup set-default work
/maencof-lens:setup set-layers work 3,4
/maencof-lens:setup remove work
```
