---
name: manage
user-invocable: false
description: 'Audits, enables, disables, deletes, or scaffolds maencof skills and agents. Use for skill or agent lifecycle management.'
argument-hint: '<list|disable|enable|delete|create> [name]'
version: '1.0.0'
complexity: medium
context_layers: []
orchestrator: manage skill
plugin: maencof
---

# manage — Skill and Agent Management

Manages the lifecycle of skills and agents in the maencof plugin, including list, disable, enable, delete, and scaffold operations.

## When to Use This Skill

- When you want to disable skills you are not using
- When you want to register a new custom skill
- "skill management", "agent management", "manage"

## Modes

### list mode

```
/maencof:manage list [--skills|--agents|--all]
```

Display a list of all installed skills/agents and their activation status.

### disable mode

```
/maencof:manage disable <name>
```

Disable a skill or agent. Registers it in disabled-registry.json to be skipped during plugin load.

### enable mode

```
/maencof:manage enable <name>
```

Re-enable a disabled skill/agent.

### delete mode

```
/maencof:manage delete <name> [--force]
```

Permanently delete a custom skill/agent. Built-in items cannot be deleted (use disable instead).

### create mode

```
/maencof:manage create <name> --type <skill|agent>
```

Generate a new custom skill/agent template:

- Skill: create `{CWD}/.claude/skills/<name>/SKILL.md` (with default template)
- Agent: create `{CWD}/.claude/agents/<name>.md` (with default template)

## Workflow

### disable/enable workflow

```
1. Read .maencof-meta/disabled-registry.json
2. Add/remove entry
3. Save changes
4. Output confirmation message
```

## Available Tools

| Tool    | Purpose                                                                                                                                                                                                          |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Read`  | Read `.maencof-meta/disabled-registry.json`                                                                                                                                                                      |
| `Write` | Write `.maencof-meta/disabled-registry.json` (disable/enable operations); create new skill/agent template files in the Execution Area (`{CWD}/.claude/skills/<name>/SKILL.md`, `{CWD}/.claude/agents/<name>.md`) |

> Note: `disabled-registry.json` is a metadata file in `.maencof-meta/` (not a vault document). It is accessed with Read/Write tools, not maencof MCP tools.
>
> Note: `mcp__plugin_maencof_tools__create` is intentionally excluded here. It creates vault knowledge documents (requires Layer + tags + Frontmatter) and is not suitable for generating plugin structure files such as SKILL.md or agent definitions. Use the `Write` tool for those.

## Error Handling

- **disabled-registry.json missing**: treat as empty registry; create on first disable operation
- **Attempt to delete built-in skill/agent**: "Built-in items cannot be deleted. Use `disable` instead."
- **Name not found**: "No skill or agent named '{name}' found."
- **Write failure during create mode**: report error; no partial file created
