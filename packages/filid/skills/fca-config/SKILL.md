---
name: fca-config
user_invocable: true
description: View and modify .filid/config.json settings — language, rule overrides, and project configuration without manual JSON editing
version: 1.0.0
complexity: low
plugin: filid
---

> **EXECUTION MODEL**: Execute the requested subcommand as a SINGLE CONTINUOUS
> OPERATION. Read config, apply changes, validate, and report — all in one turn.
> NEVER yield the turn between steps.

# fca-config — Project Configuration Manager

View and modify `.filid/config.json` settings interactively. Manages language
preferences, rule overrides, and project-level FCA-AI configuration.

> **Schema Reference**: The authoritative config schema is defined in
> `src/core/infra/config-loader.ts` (`FilidConfig` interface). This skill
> MUST NOT hardcode config keys — always read the interface definition and
> the actual config file to discover available fields.
>
> **Detail Reference**: For dot-notation path resolution, validation rules,
> and output format templates, read the `reference.md` file in this skill's
> directory (same location as this SKILL.md).

## When to Use This Skill

- Setting the output language for documents: `/filid:fca-config set language ko`
- Checking current configuration: `/filid:fca-config` or `/filid:fca-config show`
- Disabling a rule: `/filid:fca-config set rules.naming-convention.enabled false`
- Changing rule severity: `/filid:fca-config set rules.max-depth.severity warning`
- Resetting to defaults: `/filid:fca-config reset`

## Subcommands

### `show` (default)

Display the current `.filid/config.json` contents in a readable table format.
If no config file exists, report that and suggest running `/filid:fca-init`.

### `set <key> <value>`

Set a config value using dot-notation for nested paths.

```
/filid:fca-config set language ko
/filid:fca-config set rules.naming-convention.enabled false
/filid:fca-config set rules.max-depth.severity warning
```

Value type coercion:
- `true` / `false` → boolean
- Numeric strings → number
- Everything else → string

### `reset`

Reset the config to defaults. Preserves the `language` field if currently set
(unless `--full` is specified).

```
/filid:fca-config reset          # reset rules, keep language
/filid:fca-config reset --full   # reset everything
```

## Core Workflow

### Step 1 — Resolve Config Path

1. Determine the git repository root from the current working directory.
2. Config path: `<git_root>/.filid/config.json`.
3. If `.filid/config.json` does not exist and the subcommand is `show`,
   report "No config found" and suggest `/filid:fca-init`.
4. If `.filid/config.json` does not exist and the subcommand is `set`,
   create a default config first, then apply the change.

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
1. Read the current config to check for `language` field.
2. Read `src/core/infra/config-loader.ts` to find `createDefaultConfig()` output
   structure — use this as the reset baseline.
3. If not `--full`, preserve the existing `language` value.
4. Write the reset config with the Write tool.
5. Read back and verify.
6. Report: "Config reset to defaults" (with note about preserved language if applicable).

### Step 4 — Validation

After any mutation (`set` or `reset`):
1. Read the written file back.
2. Verify it is valid JSON.
3. Verify the `version` field exists.
4. Verify the `rules` object exists and is non-empty.
5. Report any validation issues.

## Usage

```
/filid:fca-config [show]
/filid:fca-config set <key> <value>
/filid:fca-config reset [--full]
```

## Examples

```
# Check current settings
/filid:fca-config

# Set output language to Korean
/filid:fca-config set language ko

# Disable naming convention rule
/filid:fca-config set rules.naming-convention.enabled false

# Reset rules but keep language
/filid:fca-config reset

# Full reset including language
/filid:fca-config reset --full
```
