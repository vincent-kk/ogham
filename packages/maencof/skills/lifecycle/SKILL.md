---
name: lifecycle
user_invocable: true
description: Register, edit, and remove dynamic actions on Claude Code hook events via conversation. Extends hooks safely through the lifecycle dispatcher without modifying static hooks.json.
version: 1.1.0
complexity: medium
context_layers: []
orchestrator: configurator
plugin: maencof
---

# lifecycle — Dynamic Hook Action Management

Register, edit, and remove dynamic actions on Claude Code lifecycle events via conversation. Uses the dispatcher pattern to extend hooks without touching static `hooks.json`.

## When to Use This Skill

- Add greetings, reminders, or alerts to lifecycle events
- Register tool-specific actions (e.g., warn before destructive commands)
- Toggle or remove existing lifecycle actions

> Manages **dynamic actions** in `lifecycle.json`. Static `hooks.json` is plugin-managed.

## Prerequisites

- maencof vault initialized (`.maencof-meta/` exists) — run `/maencof:setup` if not

## Scope

| Area | Path | Write |
|------|------|-------|
| Execution | `{CWD}/.maencof-meta/lifecycle.json` | **Yes** |
| Execution | `{CWD}/.claude/settings.local.json` | **Never** |
| Plugin | `packages/maencof/hooks/hooks.json` | **Never** |
| Plugin | `packages/maencof/` | **Never** |

## Workflow

### Step 1 — Display Registered Actions
Read `lifecycle.json` and show actions with status (active/inactive).

### Step 2 — Identify Intent and Map Event
Detect target event from natural language (SessionStart, Stop, PreToolUse, etc.).

### Step 3 — Define Action
Collect type (echo/remind), message, optional condition, and matcher for tool events.

### Step 4 — Update lifecycle.json
Write action to `lifecycle.json` after user confirmation.

### Step 5 — Confirmation
Report registered action with ID, event, type, and status. Offer instant test.

> Load `reference.md` for dispatcher pattern details, event/action specs, matcher documentation, and examples.

## Resources

| File | Content |
|------|---------|
| `reference.md` | Dispatcher pattern, supported events, action types, matcher field, detailed workflow, examples, error handling, acceptance criteria |

## Options

```
/maencof:lifecycle [mode] [id]
```

| Option | Description |
|--------|-------------|
| `list` | Display current action list |
| `add` | Add a new action (interactive) |
| `edit <id>` | Edit an existing action |
| `remove <id>` | Remove an action |
| `enable <id>` | Activate an action |
| `disable <id>` | Deactivate an action |
| `--test <id>` | Instantly test an action |
