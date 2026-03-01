---
name: manage
user_invocable: true
description: Skill/agent lifecycle management — list/disable/enable/delete/create/report modes
version: 1.0.0
complexity: medium
context_layers: []
orchestrator: manage skill
plugin: maencof
---

# manage — Skill and Agent Management

Manages the lifecycle of skills and agents in the maencof plugin.
Supports usage frequency reporting based on usage-stats.json, as well as disable/enable operations.

## When to Use This Skill

- When you want to disable skills you are not using
- When you want to check skill/agent usage statistics
- When you want to register a new custom skill
- "skill management", "agent management", "manage"

## Modes

### list mode
```
/maencof:manage list [--skills|--agents|--all]
```
Display a list of all installed skills/agents and their activation status.

### report mode
```
/maencof:manage report [--days <N>]
```
Analyze usage-stats.json and generate a usage frequency report:

```markdown
## Skill/Agent Usage Report (last N days)

| Name | Call count | Last used | Status |
|------|-----------|-----------|--------|
| explore | 12 | 2026-02-28 | active |
| organize | 3 | 2026-02-20 | active |
| ingest | 0 | — | disable recommended |
```

### disable mode
```
/maencof:manage disable <name>
```
Disable a skill or agent.
Registers it in disabled-registry.json to be skipped during plugin load.

```typescript
// Based on DisabledRegistryEntry type
{
  name: string,
  disabledAt: string,
  reason?: string,
  disabledBy: 'user' | 'system'
}
```

### enable mode
```
/maencof:manage enable <name>
```
Re-enable a disabled skill/agent.

### delete mode
```
/maencof:manage delete <name> [--force]
```
Permanently delete a custom skill/agent.
Built-in items cannot be deleted (use disable instead).

### create mode
```
/maencof:manage create <name> --type <skill|agent>
```
Generate a new custom skill/agent template:
- Skill: create `{CWD}/.claude/skills/<name>/SKILL.md` (with default template)
- Agent: create `{CWD}/.claude/agents/<name>.md` (with default template)

## Workflow

### report mode workflow

```
1. Read .maencof-meta/usage-stats.json
2. Apply period filter (--days option)
3. Aggregate usage frequency
4. Items with 0 uses -> display "disable recommended"
5. Output report
```

### disable/enable workflow

```
1. Read .maencof-meta/disabled-registry.json
2. Add/remove entry
3. Save changes
4. Output confirmation message
```

## Available Tools

| Tool | Purpose |
|------|---------|
| `Read` | Read `.maencof-meta/usage-stats.json`, `.maencof-meta/disabled-registry.json` |
| `Write` | Write `.maencof-meta/disabled-registry.json` (disable/enable operations); create new skill/agent template files in the Execution Area (`{CWD}/.claude/skills/<name>/SKILL.md`, `{CWD}/.claude/agents/<name>.md`) |

> Note: `usage-stats.json` and `disabled-registry.json` are metadata files in `.maencof-meta/`
> (not vault documents). They are accessed with Read/Write tools, not maencof MCP tools.
>
> Note: `maencof_create` is intentionally excluded here. It creates vault knowledge documents
> (requires Layer + tags + Frontmatter) and is not suitable for generating plugin structure files
> such as SKILL.md or agent definitions. Use the `Write` tool for those.

## Error Handling

- **usage-stats.json missing**: display empty report with note "No usage data found. Stats accumulate after first skill invocations."
- **disabled-registry.json missing**: treat as empty registry; create on first disable operation
- **Attempt to delete built-in skill/agent**: "Built-in items cannot be deleted. Use `disable` instead."
- **Name not found**: "No skill or agent named '{name}' found."
- **Write failure during create mode**: report error; no partial file created

## ManageResult Type

```typescript
// Based on src/types/manage.ts
{
  mode: ManageMode,
  success: boolean,
  message: string,
  affected?: string[]
}
```
