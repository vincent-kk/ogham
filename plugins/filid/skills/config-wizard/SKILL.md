---
name: config-wizard
user_invocable: true
description: '[filid:config-wizard] View and modify .filid/config.json interactively using show, set, and reset subcommands with dot-notation paths for language, rule enablement, and severity settings.'
argument-hint: '[show | set KEY VALUE | reset [--full]]'
version: '1.0.0'
complexity: simple
plugin: filid
---

# config-wizard — Project Configuration Manager

View and modify `.filid/config.json` settings interactively. Manages language
preferences, rule overrides, and project-level FCA-AI configuration.

> **Schema Source**: The authoritative `FilidConfig` shape is defined in the
> filid plugin's internal source (`src/core/infra/config-loader/loaders/config-schemas.ts`).
> That source is NOT distributed to user projects, so this skill MUST NOT
> hardcode config keys AND MUST NOT attempt to read that source file at
> runtime. Observe the actual `.filid/config.json` on disk with Read; when
> the default shape is needed (e.g., `reset`), rely on `mcp_t_project_init`
> to emit it (see Step 3 `reset`).
>
> **Detail Reference**: For dot-notation path resolution, validation rules,
> and output format templates, read the `reference.md` file in this skill's
> directory (same location as this SKILL.md).

## When to Use This Skill

- Setting the output language for documents: `/filid:config-wizard set language ko`
- Checking current configuration: `/filid:config-wizard` or `/filid:config-wizard show`
- Disabling a rule: `/filid:config-wizard set rules.naming-convention.enabled false`
- Changing rule severity: `/filid:config-wizard set rules.max-depth.severity warning`
- Resetting to defaults: `/filid:config-wizard reset`

## Subcommands

### `show` (default)

Display the current `.filid/config.json` contents in a readable table format.
If no config file exists, report that and suggest running `/filid:setup`.

### `set <key> <value>`

Set a config value using dot-notation for nested paths.

```
/filid:config-wizard set language ko
/filid:config-wizard set rules.naming-convention.enabled false
/filid:config-wizard set rules.max-depth.severity warning
```

Value type coercion:

- `true` / `false` → boolean
- Numeric strings → number
- Everything else → string

### `reset`

Reset the config to defaults. Preserves the `language` field if currently set
(unless `--full` is specified).

```
/filid:config-wizard reset          # reset rules, keep language
/filid:config-wizard reset --full   # reset everything
```

## Core Workflow

### Step 1 — Resolve Config Path

1. Determine the git repository root from the current working directory.
2. Config path: `<git_root>/.filid/config.json`.
3. If `.filid/config.json` does not exist and the subcommand is `show`,
   report "No config found" and suggest `/filid:setup`.
4. If `.filid/config.json` does not exist and the subcommand is `set`,
   create a default config first, then apply the change.
5. If `.filid/config.json` does not exist and the subcommand is `reset`,
   skip the read/delete in Step 3 and proceed directly to the
   `mcp_t_project_init` regeneration call.

### Step 2 — Parse Arguments

Parse the user's input to determine the subcommand and arguments.

> Options are LLM-interpreted hints, not strict CLI flags. Natural language
> works equally well (e.g., "set the language to Korean" instead of
> `set language ko`).

### Step 3 — Execute Subcommand

**For `show`**:

1. Read `.filid/config.json` with the Read tool.
2. Format and display as a structured table (see reference.md for format).
3. Highlight the `language` field with its resolved value
   (config value or "en" default).

**For `set`**:

1. Read `.filid/config.json` with the Read tool.
2. Resolve the dot-notation path to locate the target field.
   See reference.md for the path resolution algorithm.
3. Apply value type coercion (boolean/number/string).
4. Write the modified JSON back with the Write tool (pretty-printed, 2-space indent).
5. Read back the file to verify the change was persisted.
6. Report the change: `Set <key> = <value>`.

**For `reset`**:

1. Read the current `.filid/config.json`. If `--full` is absent, capture the
   existing `language` field (may be undefined).
2. Delete the current config via Bash: `rm <git_root>/.filid/config.json`.
3. Call `mcp_t_project_init({ path: <git_root> })`. Because the file no longer
   exists, the handler writes the output of `createDefaultConfig()` (defined
   in the plugin's internal `src/core/infra/config-loader/loaders/create-default-config.ts`
   — referenced here only as documentation; do NOT attempt to Read it).
4. If `--full` is absent AND the captured `language` is defined, re-apply it
   by reading the freshly written config, setting `config.language = <captured>`,
   and writing it back with the Write tool (pretty-printed, 2-space indent).
5. Read back and verify per Step 4 (Validation).
6. Report: "Config reset to defaults". If `--full` is absent, append
   "Language preserved: <value>" on the next line.

### Step 4 — Validation

After any mutation (`set` or `reset`):

1. Read the written file back.
2. Verify it is valid JSON.
3. Verify the `version` field exists.
4. Verify the `rules` object exists and is non-empty.
5. Report any validation issues.

## Usage

```
/filid:config-wizard [show]
/filid:config-wizard set <key> <value>
/filid:config-wizard reset [--full]
```

## Examples

```
# Check current settings
/filid:config-wizard

# Set output language to Korean
/filid:config-wizard set language ko

# Disable naming convention rule
/filid:config-wizard set rules.naming-convention.enabled false

# Reset rules but keep language
/filid:config-wizard reset

# Full reset including language
/filid:config-wizard reset --full
```
