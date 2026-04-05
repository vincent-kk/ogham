# YAML Frontmatter Specification

Complete field-by-field specification for Claude Code subagent frontmatter.

## File Format

Subagent files are Markdown with YAML frontmatter delimited by `---` lines:

```markdown
---
name: agent-name
description: When Claude should delegate to this agent
tools: Read, Grep, Glob
model: sonnet
---

System prompt content here (markdown body).
```

The frontmatter defines configuration. The markdown body becomes the system prompt. Subagents receive only this system prompt plus basic environment details (working directory), NOT the full Claude Code system prompt.

---

## Required Fields

### `name`

| Property | Value |
|----------|-------|
| Type | String |
| Required | Yes |
| Format | `[a-z][a-z0-9-]*` (lowercase letters, digits, hyphens) |
| Uniqueness | Must be unique within its scope directory |

**Valid**: `code-reviewer`, `data-scientist`, `db-reader`, `my-agent-v2`
**Invalid**: `Code_Reviewer`, `dataScientist`, `my agent`, `123-agent`

### `description`

| Property | Value |
|----------|-------|
| Type | String |
| Required | Yes |
| Purpose | Claude uses this to decide when to delegate tasks |
| Min Length | 20 characters (recommended) |

**Writing effective descriptions**:
- Be specific about WHEN to delegate, not just WHAT the agent does
- Include trigger phrases that match user intent
- Add "use proactively" to enable auto-delegation
- Mention the domain explicitly

**Good examples**:
```yaml
description: "Expert code review specialist. Proactively reviews code for quality, security, and maintainability. Use immediately after writing or modifying code."

description: "Debugging specialist for errors, test failures, and unexpected behavior. Use proactively when encountering any issues."

description: "Data analysis expert for SQL queries, BigQuery operations, and data insights. Use proactively for data analysis tasks and queries."
```

**Bad examples**:
```yaml
description: "Reviews code"  # Too vague
description: "Helps with stuff"  # No delegation trigger
description: "A really amazing and wonderful code analysis tool"  # Marketing fluff
```

---

## Optional Fields

### `tools`

| Property | Value |
|----------|-------|
| Type | Comma-separated string or YAML list |
| Default | Inherits all tools from main conversation |
| Behavior | Allowlist - only listed tools are available |

**Format options**:
```yaml
# String format
tools: Read, Grep, Glob, Bash

# List format
tools:
  - Read
  - Grep
  - Glob
  - Bash
```

**Special Task syntax** (main thread agents only):
```yaml
# Allow spawning any subagent
tools: Task, Read, Bash

# Allow spawning only specific subagents
tools: Task(worker, researcher), Read, Bash

# Omit Task to prevent subagent spawning
tools: Read, Bash
```

Note: `Task(agent-name)` restriction only applies to agents running as main thread via `claude --agent`. Subagents cannot spawn other subagents regardless.

### `disallowedTools`

| Property | Value |
|----------|-------|
| Type | Comma-separated string or YAML list |
| Default | None |
| Behavior | Denylist - removes from inherited or specified set |

```yaml
# Inherit all tools except Write and Edit
disallowedTools: Write, Edit
```

**Conflict rule**: A tool cannot appear in both `tools` and `disallowedTools`.

### `model`

| Property | Value |
|----------|-------|
| Type | String enum |
| Values | `sonnet`, `opus`, `haiku`, `inherit` |
| Default | `inherit` |

### `permissionMode`

| Property | Value |
|----------|-------|
| Type | String enum |
| Values | `default`, `acceptEdits`, `dontAsk`, `bypassPermissions`, `plan` |
| Default | `default` |

**Inheritance rule**: If parent uses `bypassPermissions`, it takes precedence and cannot be overridden by the subagent.

### `maxTurns`

| Property | Value |
|----------|-------|
| Type | Positive integer |
| Default | Unlimited |
| Purpose | Cap agentic turns to prevent runaway execution |

### `skills`

| Property | Value |
|----------|-------|
| Type | YAML list of skill names |
| Default | None |
| Behavior | Full skill content injected into context at startup |

```yaml
skills:
  - api-conventions
  - error-handling-patterns
```

Subagents do NOT inherit skills from parent conversation. Must be listed explicitly.

### `mcpServers`

| Property | Value |
|----------|-------|
| Type | YAML mapping |
| Default | Inherits MCP servers from main conversation |

```yaml
# Reference already-configured server
mcpServers:
  slack: {}

# Inline definition
mcpServers:
  custom-api:
    command: node
    args: ["./mcp-server.js"]
    env:
      API_KEY: "${API_KEY}"
```

**Limitation**: MCP tools are NOT available in background subagents.

### `hooks`

| Property | Value |
|----------|-------|
| Type | YAML mapping of hook events |
| Events | `PreToolUse`, `PostToolUse`, `Stop` |

```yaml
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate.sh"
  PostToolUse:
    - matcher: "Edit|Write"
      hooks:
        - type: command
          command: "./scripts/post-edit.sh"
  Stop:
    - hooks:
        - type: command
          command: "./scripts/cleanup.sh"
```

`Stop` hooks are automatically converted to `SubagentStop` at runtime.

### `memory`

| Property | Value |
|----------|-------|
| Type | String enum |
| Values | `user`, `project`, `local` |
| Default | Disabled |

| Scope | Directory | Use Case |
|-------|-----------|----------|
| `user` | `~/.claude/agent-memory/<name>/` | Cross-project learnings |
| `project` | `.claude/agent-memory/<name>/` | Project-specific, shareable via VCS |
| `local` | `.claude/agent-memory-local/<name>/` | Project-specific, private |

When enabled:
- Read, Write, Edit tools are auto-enabled
- First 200 lines of `MEMORY.md` injected into system prompt
- Agent can create additional files in memory directory

---

## Field Interactions

### tools + disallowedTools
- If `tools` is set: `disallowedTools` removes from that explicit list
- If `tools` is omitted: `disallowedTools` removes from inherited set
- A tool cannot appear in both (validation error)

### memory + tools
- When `memory` is set: Read, Write, Edit are auto-enabled even if not in `tools`
- This ensures the agent can manage its memory files

### permissionMode + parent
- If parent uses `bypassPermissions`: subagent's `permissionMode` is ignored
- Otherwise: subagent's `permissionMode` overrides parent's mode

### model + inherit
- `inherit` uses whatever model the user's main conversation is using
- Explicit model (`haiku`/`sonnet`/`opus`) always overrides regardless of parent

---

## CLI Agent Format

Agents can be defined via `--agents` CLI flag as JSON:

```bash
claude --agents '{
  "agent-name": {
    "description": "When to delegate",
    "prompt": "System prompt content",
    "tools": ["Read", "Grep", "Glob", "Bash"],
    "model": "sonnet",
    "permissionMode": "default",
    "maxTurns": 10,
    "skills": ["skill-name"],
    "mcpServers": {},
    "hooks": {},
    "memory": "user"
  }
}'
```

The `prompt` field replaces the markdown body. All other fields map 1:1 to frontmatter fields.
