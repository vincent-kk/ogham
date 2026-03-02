# Tool Catalog

Complete catalog of tools available to Claude Code subagents.

---

## Core Tools

### Read-Only Tools

| Tool | Description | Common Use |
|------|-------------|------------|
| `Read` | Read file contents from local filesystem | View source code, configs, docs |
| `Grep` | Search file contents with regex patterns | Find code patterns, symbols, references |
| `Glob` | Find files by name/path pattern matching | Locate files, discover project structure |
| `WebFetch` | Fetch and process web content via URL | Read documentation, API references |
| `WebSearch` | Search the web for information | Find current docs, solutions, references |

### Write Tools

| Tool | Description | Common Use |
|------|-------------|------------|
| `Write` | Create or overwrite files | Generate new files, configs |
| `Edit` | Make targeted string replacements in files | Modify existing code, fix bugs |
| `NotebookEdit` | Edit Jupyter notebook cells | Modify data analysis notebooks |

### Execution Tools

| Tool | Description | Common Use |
|------|-------------|------------|
| `Bash` | Run shell commands with optional timeout | Build, test, git operations, CLI tools |
| `Task` | Spawn subagents for delegated work | Orchestrate multi-agent workflows |

### Interaction Tools

| Tool | Description | Common Use |
|------|-------------|------------|
| `AskUserQuestion` | Present questions to user with options | Gather decisions, clarify requirements |

---

## Tool Restriction Patterns

### Read-Only Agent
```yaml
tools: Read, Grep, Glob
```
Safest configuration. Cannot modify files, run commands, or interact. Suitable for pure analysis.

### Read-Only with Bash
```yaml
tools: Read, Grep, Glob, Bash
```
Can run commands (git diff, test suites) but cannot modify files directly. Common for reviewers.

### Implementation Agent
```yaml
tools: Read, Write, Edit, Bash, Grep, Glob
```
Full development capability. Can read, write, edit files and run commands. For builders and debuggers.

### Minimal Data Agent
```yaml
tools: Bash, Read, Write
```
Focused on command execution and file I/O. For data analysis, scripting tasks.

### Documentation Agent
```yaml
tools: Read, Write, Grep, Glob, WebFetch
```
Can read codebase and web resources, write documentation. No command execution.

### Orchestrator Agent
```yaml
tools: Task(agent-a, agent-b), Read, Bash
```
Can spawn specific subagents and read results. For coordination patterns.

---

## Task Tool Special Syntax

The `Task` tool has special syntax for controlling subagent spawning:

### Allow All Subagents
```yaml
tools: Task, Read, Bash
```

### Allow Specific Subagents Only
```yaml
tools: Task(code-reviewer, debugger), Read, Bash
```
This is an allowlist. Only named agents can be spawned.

### Prevent All Subagent Spawning
```yaml
# Simply omit Task from tools
tools: Read, Bash
```

### Important Limitations
- `Task(agent-name)` only works for agents running as main thread (`claude --agent`)
- Subagents cannot spawn other subagents regardless of `Task` in their tools
- If an agent tries to spawn a non-allowed agent, the request fails

---

## Using disallowedTools

Use `disallowedTools` when you want to inherit most tools but block specific ones:

### Block File Modification
```yaml
disallowedTools: Write, Edit, NotebookEdit
```

### Block Command Execution
```yaml
disallowedTools: Bash
```

### Block Subagent Spawning
```yaml
disallowedTools: Task
```

### Block Specific Subagent
In `settings.json` permissions:
```json
{
  "permissions": {
    "deny": ["Task(agent-name)"]
  }
}
```

---

## Tool Availability in Different Contexts

| Context | Tools Available |
|---------|----------------|
| Foreground subagent | All configured tools, including MCP |
| Background subagent | Configured tools except MCP tools |
| Resumed subagent | Same tools as original invocation |
| CLI-defined agent | Tools specified in JSON config |

### Background Subagent Restrictions
- MCP tools are NOT available
- `AskUserQuestion` calls fail (but agent continues)
- Permissions must be pre-approved before launch
- Auto-denies anything not pre-approved
