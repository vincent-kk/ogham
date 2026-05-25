# Frontmatter Specification — Deep Dive

Advanced field interaction rules, validation logic, and edge cases not covered in the main reference.

For field definitions, see **reference.md Section 1**.

---

## Field Interaction Rules

### tools + disallowedTools

When both are specified, `disallowedTools` is applied first to remove tools from the inherited/specified set, then `tools` is resolved against the remaining pool. A tool listed in both is removed:

```yaml
tools: Read, Write, Edit, Bash    # Allowlist
disallowedTools: Bash              # Remove from allowlist
# Result: Read, Write, Edit
```

When only `disallowedTools` is set, the agent inherits all parent tools minus the denied ones:

```yaml
disallowedTools: Write, Edit
# Result: all parent tools except Write and Edit
```

### memory + tools

When `memory` is enabled, Read, Write, and Edit are **automatically added** to the tool set even if not listed in `tools`:

```yaml
tools: Grep, Glob
memory: project
# Effective tools: Grep, Glob, Read, Write, Edit
```

### permissionMode + parent

Permission inheritance follows a strict hierarchy:

```
Parent: bypassPermissions → subagent permissionMode IGNORED (parent wins)
Parent: auto              → subagent inherits auto (frontmatter ignored)
Parent: default           → subagent uses its own permissionMode
```

### model + inherit

`inherit` resolves at spawn time, not at definition time. If the parent switches models mid-conversation, the next spawned subagent inherits the new model.

Resolution chain:
```
CLAUDE_CODE_SUBAGENT_MODEL env var
  → Agent tool call `model` parameter
    → Frontmatter `model` field
      → Parent's current model
```

### background + AskUserQuestion

Background agents cannot interact with the user. `AskUserQuestion` will fail silently. Design background agents to be fully autonomous:

```yaml
background: true
tools: Read, Grep, Glob, Bash, Write   # No AskUserQuestion
```

### effort + model

The `max` effort level is only supported on Opus 4.6. Using it with other models has no additional effect beyond `high`:

```yaml
model: opus
effort: max     # Full extended thinking
```

```yaml
model: sonnet
effort: high    # Maximum supported level for sonnet
```

### isolation + background

Worktree isolation works with both foreground and background agents. The worktree is created fresh for each agent invocation:

```yaml
isolation: worktree
background: true
# Agent runs in isolated worktree, non-blocking
```

If the agent makes changes, the worktree path and branch name are returned to the parent for review/merge.

---

## Validation Logic

### Name Validation

```
Pattern: /^[a-z][a-z0-9-]*$/
Min length: 2
Max length: 64
Reserved: "default", "inherit", "none"
```

### Description Validation

```
Min length: 10 characters
Must contain at least one action verb
Should not start with "A" or "An" (article)
Should describe WHEN to delegate, not WHAT the agent is
```

### Tool Name Resolution

```
1. Check against core tool catalog (exact match)
2. Check Agent(<names>) pattern
3. Check mcp__<server>__<tool> pattern
4. Check MCP server is configured (warning only)
```

---

## CLI Agent Format

For `--agents` flag, use JSON instead of YAML:

```json
{
  "agent-name": {
    "description": "When to delegate",
    "prompt": "System prompt content",
    "tools": ["Read", "Grep", "Glob"],
    "model": "sonnet",
    "permissionMode": "default"
  }
}
```

Fields map to frontmatter fields. `prompt` replaces the markdown body (system prompt).

---

## Edge Cases

### Empty tools field

```yaml
tools:
```

An empty `tools` field means NO tools available. This is different from omitting it (which inherits all).

### Multiple agents with same name

Higher priority source wins. No merge — complete override. Check with `LIST` mode to detect conflicts.

### Subagent spawning restricted subagents

```yaml
tools: Agent(code-reviewer), Read, Grep
```

This agent can ONLY spawn `code-reviewer` type subagents. Attempting to spawn other types fails silently.

### initialPrompt with skills

```yaml
initialPrompt: "/my-custom-skill --flag"
skills:
  - my-custom-skill
```

The initial prompt can reference preloaded skills. The skill must be in the `skills` list to be available.
