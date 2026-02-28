---
name: manage
user_invocable: true
description: Skill/agent lifecycle management — list/disable/enable/delete/create/report modes
version: 1.0.0
complexity: medium
context_layers: [1, 2, 3, 4]
orchestrator: manage skill
plugin: coffaen
---

# manage — Skill and Agent Management

Manages the lifecycle of skills and agents in the coffaen plugin.
Supports usage frequency reporting based on usage-stats.json, as well as disable/enable operations.

## When to Use This Skill

- When you want to disable skills you are not using
- When you want to check skill/agent usage statistics
- When you want to register a new custom skill
- "skill management", "agent management", "manage"

## Modes

### list mode
```
/coffaen:manage list [--skills|--agents|--all]
```
Display a list of all installed skills/agents and their activation status.

### report mode
```
/coffaen:manage report [--days <N>]
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
/coffaen:manage disable <name>
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
/coffaen:manage enable <name>
```
Re-enable a disabled skill/agent.

### delete mode
```
/coffaen:manage delete <name> [--force]
```
Permanently delete a custom skill/agent.
Built-in items cannot be deleted (use disable instead).

### create mode
```
/coffaen:manage create <name> --type <skill|agent>
```
Generate a new custom skill/agent template:
- Skill: create `skills/<name>/SKILL.md` (with default template)
- Agent: create `agents/<name>.md` (with default template)

## Workflow

### report mode workflow

```
1. Read .coffaen-meta/usage-stats.json
2. Apply period filter (--days option)
3. Aggregate usage frequency
4. Items with 0 uses -> display "disable recommended"
5. Output report
```

### disable/enable workflow

```
1. Read .coffaen-meta/disabled-registry.json
2. Add/remove entry
3. Save changes
4. Output confirmation message
```

## Available MCP Tools

| Tool | Purpose |
|------|---------|
| `coffaen_read` | Query usage-stats.json, disabled-registry.json |
| `coffaen_create` | Create new skill/agent files |
| `coffaen_update` | Update disabled-registry.json |

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
