# Subagent Constructor Reference

Complete specification reference for building Claude Code subagents.

---

## Table of Contents

1. [YAML Frontmatter Specification](#1-yaml-frontmatter-specification)
2. [Tool Catalog](#2-tool-catalog)
3. [Permission Modes](#3-permission-modes)
4. [Hook Configuration](#4-hook-configuration)
5. [Memory Configuration](#5-memory-configuration)
6. [Model Selection](#6-model-selection)
7. [Skills Injection](#7-skills-injection)
8. [MCP Server Configuration](#8-mcp-server-configuration)
9. [Scope and Priority](#9-scope-and-priority)
10. [Validation Rules](#10-validation-rules)
11. [Mode Workflows](#11-mode-workflows)

---

## 1. YAML Frontmatter Specification

Subagent files use YAML frontmatter delimited by `---` lines, followed by the system prompt in Markdown.

### Required Fields

#### `name`
- **Type**: String
- **Format**: Lowercase letters and hyphens only (`[a-z][a-z0-9-]*`)
- **Uniqueness**: Must be unique within its scope directory
- **Examples**: `code-reviewer`, `data-scientist`, `db-reader`
- **Invalid**: `Code_Reviewer`, `dataScientist`, `my agent`

#### `description`
- **Type**: String
- **Purpose**: Claude uses this to decide when to delegate tasks
- **Best Practice**: Include specific trigger phrases and "use proactively" if auto-delegation desired
- **Minimum Length**: 20 characters recommended
- **Examples**:
  - Good: `"Expert code review specialist. Proactively reviews code for quality, security, and maintainability. Use immediately after writing or modifying code."`
  - Bad: `"Reviews code"` (too vague for delegation decisions)

### Optional Fields

#### `tools`
- **Type**: Comma-separated string or YAML list
- **Default**: Inherits all tools from main conversation (including MCP tools)
- **Behavior**: Allowlist - only listed tools are available
- **Special Syntax**: `Task(agent-name)` restricts spawnable subagents (main thread only)
- **Format Options**:
  ```yaml
  # Comma-separated string
  tools: Read, Grep, Glob, Bash

  # YAML list
  tools:
    - Read
    - Grep
    - Glob
    - Bash
  ```

#### `disallowedTools`
- **Type**: Comma-separated string or YAML list
- **Default**: None
- **Behavior**: Denylist - removes tools from inherited or specified set
- **Use Case**: When inheriting all tools but need to block specific ones
- **Example**: `disallowedTools: Write, Edit` (allow everything except file modification)

#### `model`
- **Type**: String enum
- **Values**: `sonnet`, `opus`, `haiku`, `inherit`
- **Default**: `inherit` (same model as main conversation)
- **Selection Guide**:
  - `haiku`: Fast lookups, simple scans, narrow checks (cheapest)
  - `sonnet`: Standard implementation, debugging, reviews (balanced)
  - `opus`: Architecture, deep analysis, complex reasoning (most capable)
  - `inherit`: Match parent conversation model

#### `permissionMode`
- **Type**: String enum
- **Values**: `default`, `acceptEdits`, `dontAsk`, `bypassPermissions`, `plan`
- **Default**: `default`
- **Inheritance**: If parent uses `bypassPermissions`, it takes precedence and cannot be overridden

#### `maxTurns`
- **Type**: Integer (positive)
- **Default**: Unlimited
- **Purpose**: Cap agentic turns to prevent runaway execution
- **Use Case**: Short-lived agents that should complete quickly

#### `skills`
- **Type**: YAML list of skill names
- **Default**: None (subagents don't inherit parent skills)
- **Behavior**: Full skill content is injected into subagent context at startup
- **Example**:
  ```yaml
  skills:
    - api-conventions
    - error-handling-patterns
  ```

#### `mcpServers`
- **Type**: YAML mapping
- **Format**: Server name as key, either empty (references configured server) or inline config
- **Example**:
  ```yaml
  mcpServers:
    slack: {}  # Reference already-configured server
    custom-api:  # Inline definition
      command: node
      args: ["./mcp-server.js"]
  ```

#### `hooks`
- **Type**: YAML mapping of hook events
- **Supported Events**: `PreToolUse`, `PostToolUse`, `Stop`
- **Structure**:
  ```yaml
  hooks:
    PreToolUse:
      - matcher: "ToolName"
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

#### `memory`
- **Type**: String enum
- **Values**: `user`, `project`, `local`
- **Default**: Disabled
- **Directories**:
  - `user`: `~/.claude/agent-memory/<name>/`
  - `project`: `.claude/agent-memory/<name>/`
  - `local`: `.claude/agent-memory-local/<name>/`
- **Auto-enabled tools**: Read, Write, Edit (for memory file management)
- **Auto-injected**: First 200 lines of `MEMORY.md` in memory directory

---

## 2. Tool Catalog

### Core Tools
| Tool | Category | Description |
|------|----------|-------------|
| `Read` | Read-only | Read file contents |
| `Grep` | Read-only | Search file contents with regex |
| `Glob` | Read-only | Find files by pattern |
| `WebFetch` | Read-only | Fetch and process web content |
| `WebSearch` | Read-only | Search the web |
| `Write` | Write | Create or overwrite files |
| `Edit` | Write | Make targeted edits to files |
| `NotebookEdit` | Write | Edit Jupyter notebook cells |
| `Bash` | Execution | Run shell commands |
| `Task` | Execution | Spawn subagents (main thread only) |
| `AskUserQuestion` | Interaction | Ask user for input |

### Special Tool Syntax
- `Task`: Allow spawning any subagent
- `Task(worker, researcher)`: Only allow spawning `worker` and `researcher` subagents
- Omitting `Task` from tools list: Prevent all subagent spawning

### Common Tool Combinations
| Use Case | Tools |
|----------|-------|
| Read-only analysis | `Read, Grep, Glob` |
| Code review | `Read, Grep, Glob, Bash` |
| Implementation | `Read, Write, Edit, Bash, Grep, Glob` |
| Data analysis | `Bash, Read, Write` |
| Documentation | `Read, Write, Grep, Glob, WebFetch` |

---

## 3. Permission Modes

| Mode | Behavior | Use Case |
|------|----------|----------|
| `default` | Standard permission checking with user prompts | General-purpose agents |
| `acceptEdits` | Auto-accept file edits, prompt for other actions | Trusted implementation agents |
| `dontAsk` | Auto-deny permission prompts (explicitly allowed tools still work) | Restricted agents |
| `bypassPermissions` | Skip all permission checks | Fully trusted automation |
| `plan` | Read-only exploration mode | Research and planning agents |

### Permission Inheritance
- Subagents inherit permission context from main conversation
- `permissionMode` in frontmatter can override the mode
- Exception: Parent's `bypassPermissions` takes precedence and cannot be overridden

---

## 4. Hook Configuration

### Supported Events in Subagent Frontmatter

| Event | Matcher Input | When It Fires |
|-------|--------------|---------------|
| `PreToolUse` | Tool name | Before subagent uses a tool |
| `PostToolUse` | Tool name | After subagent uses a tool |
| `Stop` | (none) | When subagent finishes (converted to SubagentStop) |

### Hook Input Format
Hooks receive JSON via stdin with structure:
```json
{
  "tool_name": "Bash",
  "tool_input": {
    "command": "SELECT * FROM users"
  },
  "session_id": "...",
  "cwd": "/path/to/project",
  "hook_event_name": "PreToolUse"
}
```

### Exit Codes
| Code | Behavior |
|------|----------|
| 0 | Allow - proceed normally |
| 1 | Error - hook itself failed (tool still proceeds) |
| 2 | Block - prevent the tool execution, feed stderr to Claude |

### Project-Level Subagent Events
Configure in `settings.json` to respond to subagent lifecycle:

| Event | Matcher Input | When It Fires |
|-------|--------------|---------------|
| `SubagentStart` | Agent type name | When subagent begins |
| `SubagentStop` | Agent type name | When subagent completes |

---

## 5. Memory Configuration

### Scope Selection Guide

| Scope | Directory | Best For |
|-------|-----------|----------|
| `user` | `~/.claude/agent-memory/<name>/` | Cross-project learnings (recommended default) |
| `project` | `.claude/agent-memory/<name>/` | Project-specific knowledge (shareable via VCS) |
| `local` | `.claude/agent-memory-local/<name>/` | Project-specific, private knowledge |

### Memory Behavior
- Auto-enables Read, Write, Edit tools for memory management
- Injects first 200 lines of `MEMORY.md` into system prompt
- Agent can create additional files in memory directory
- Persists across conversations within scope

### Memory Prompt Tips
Include instructions in the system prompt:
```markdown
Update your agent memory as you discover patterns, conventions, and
architectural decisions. Write concise notes about what you found and where.
Consult your memory before starting work to build on previous sessions.
```

---

## 6. Model Selection

### Decision Tree

```
Is the task simple and fast? → haiku
├── Simple file scanning
├── Quick lookups
└── Narrow code checks

Is the task standard complexity? → sonnet
├── Code implementation
├── Debugging
├── Code review
└── Documentation writing

Is the task complex reasoning? → opus
├── Architecture design
├── Deep analysis
├── Complex refactoring
└── Multi-system reasoning

Should it match the user's session? → inherit
├── When model choice doesn't matter
└── When user controls the quality level
```

### Cost-Performance Tradeoffs
- `haiku`: ~10x cheaper than opus, fastest response, good for focused tasks
- `sonnet`: ~3x cheaper than opus, balanced capability
- `opus`: Most capable, best for tasks requiring deep reasoning
- `inherit`: Adapts to user's current session model

---

## 7. Skills Injection

### How It Works
- Full skill content is injected at subagent startup
- Subagents do NOT inherit skills from parent conversation
- Skills must be explicitly listed in `skills` field
- Skill content becomes part of the subagent's system prompt context

### Configuration
```yaml
skills:
  - skill-name-1
  - skill-name-2
```

### Inverse Pattern
The `context: fork` in a skill's own config achieves the inverse:
- Subagent `skills` field: Subagent controls prompt, loads skill content
- Skill `context: fork`: Skill content injected into specified agent

---

## 8. MCP Server Configuration

### Reference Configured Servers
```yaml
mcpServers:
  slack: {}
  github: {}
```

### Inline Server Definition
```yaml
mcpServers:
  custom-api:
    command: node
    args: ["./mcp-server.js"]
    env:
      API_KEY: "${API_KEY}"
```

### Background Subagent Limitation
MCP tools are NOT available in background subagents. If a subagent needs MCP access, run it in the foreground.

---

## 9. Scope and Priority

### Resolution Order (highest to lowest)
1. `--agents` CLI flag (session-only)
2. `.claude/agents/` (project)
3. `~/.claude/agents/` (user)
4. Plugin `agents/` directory

### Conflict Resolution
When multiple subagents share the same `name`, the higher-priority scope wins.

### Disabling Subagents
Add to `permissions.deny` in settings:
```json
{
  "permissions": {
    "deny": ["Task(agent-name)"]
  }
}
```
Or via CLI: `claude --disallowedTools "Task(agent-name)"`

---

## 10. Validation Rules

### 12-Point Compliance Checklist

| # | Check | Severity | Rule |
|---|-------|----------|------|
| 1 | `name` present | Error | Required field |
| 2 | `name` format | Error | Must match `[a-z][a-z0-9-]*` |
| 3 | `description` present | Error | Required field |
| 4 | `description` quality | Warning | Should be >20 chars and specific |
| 5 | `tools` validity | Error | Each tool must be in catalog |
| 6 | `tools`/`disallowedTools` conflict | Error | No tool in both lists |
| 7 | `model` validity | Error | Must be `sonnet`/`opus`/`haiku`/`inherit` |
| 8 | `permissionMode` validity | Error | Must be valid enum value |
| 9 | `hooks` structure | Error | Must follow event/matcher/command pattern |
| 10 | `memory` validity | Warning | Must be `user`/`project`/`local` |
| 11 | System prompt present | Error | Markdown body must not be empty |
| 12 | Name uniqueness | Warning | No duplicate names in same scope |

### Severity Levels
- **Error**: Subagent will not function correctly. Must fix.
- **Warning**: Subagent works but may have issues. Should fix.
- **Info**: Optimization suggestion. Consider fixing.

---

## 11. Mode Workflows

### CREATE Mode Detailed Workflow

**Phase 1: Requirements Discovery**
```
Input: User request for new subagent
Actions:
  1. Identify primary purpose (what task does it handle?)
  2. Determine scope (project vs user vs session)
  3. Assess tool needs (read-only? write? execute?)
  4. Check for hook requirements (command validation needed?)
  5. Evaluate memory needs (cross-session learning needed?)
  6. Identify skill dependencies (existing skills to inject?)
Output: Requirements specification
```

**Phase 2: Template Selection**
```
Input: Requirements specification
Decision Logic:
  IF tools are read-only AND no hooks → read-only-agent template
  IF all tools needed AND no hooks → full-capability-agent template
  IF specific domain AND custom model → domain-specialist template
  IF hooks needed for validation → hook-validated-agent template
Output: Selected template with customization plan
```

**Phase 3: Configuration Assembly**
```
Input: Template + requirements
Actions:
  1. Set name (lowercase-hyphenated)
  2. Write description (specific, delegation-aware)
  3. Configure tools (minimal necessary set)
  4. Set model (match task complexity to model capability)
  5. Configure permissionMode (least privilege)
  6. Add hooks if needed (PreToolUse validators)
  7. Configure memory if needed (choose scope)
  8. Add skills if needed (explicit list)
  9. Configure mcpServers if needed
  10. Set maxTurns if needed
Output: Complete YAML frontmatter
```

**Phase 4: Prompt Engineering**
```
Input: Frontmatter + requirements
Actions:
  1. Write role definition (who is this agent?)
  2. Define invocation behavior (what happens when started?)
  3. Specify workflow steps (numbered process)
  4. Set output format (what does the agent return?)
  5. Add constraints (what should it NOT do?)
Output: System prompt markdown
```

**Phase 5: Validation**
```
Input: Complete subagent file
Actions:
  1. Run 12-point compliance checklist
  2. Report issues by severity
  3. Auto-fix trivial issues (formatting)
  4. Request user confirmation for substantive fixes
Output: Validated subagent file
```

**Phase 6: Deployment**
```
Input: Validated subagent file
Actions:
  1. Determine target directory from scope
  2. Check for name conflicts in target scope
  3. Write file to target directory
  4. Verify file is loadable (restart reminder or /agents)
  5. If hooks defined, verify hook scripts exist and are executable
Output: Deployed subagent ready for use
```

### EDIT Mode Detailed Workflow

**Phase 1: Load and Analyze**
```
Input: Subagent name or file path + change request
Actions:
  1. Locate subagent file across all scopes
  2. Parse YAML frontmatter and markdown body
  3. Identify which fields need modification
Output: Parsed subagent + change plan
```

**Phase 2: Apply Changes**
```
Input: Parsed subagent + change plan
Actions:
  1. Modify frontmatter fields as requested
  2. Update system prompt if needed
  3. Preserve unmodified fields exactly
Output: Modified subagent file
```

**Phase 3: Validate and Deploy**
```
Input: Modified subagent file
Actions:
  1. Run 12-point validation
  2. Compare before/after for review
  3. Write updated file
Output: Updated subagent
```

### VALIDATE Mode Detailed Workflow

**Phase 1: Parse**
```
Input: File path or directory
Actions:
  1. Find all .md files with YAML frontmatter
  2. Parse each file's frontmatter and body
Output: Parsed subagent data
```

**Phase 2: Check**
```
Input: Parsed subagent data
Actions:
  1. Run 12-point checklist per file
  2. Cross-check for name conflicts
  3. Verify referenced resources exist (hooks, skills, MCP servers)
Output: Compliance report
```

**Phase 3: Report**
```
Input: Compliance report
Actions:
  1. Group issues by severity
  2. Provide fix suggestions
  3. Summary statistics
Output: Formatted report
```

### LIST Mode Detailed Workflow

**Phase 1: Scan**
```
Input: (none - scans all scopes)
Directories:
  1. .claude/agents/ (project)
  2. ~/.claude/agents/ (user)
  3. Plugin agents/ directories
Output: File list with scope labels
```

**Phase 2: Parse and Display**
```
Input: File list
Actions:
  1. Parse each file's frontmatter
  2. Extract name, description, model, tools summary
  3. Flag scope conflicts (same name, different scope)
  4. Display organized table
Output: Subagent inventory
```
