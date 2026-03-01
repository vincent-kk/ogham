# craft-agent — Reference

Detailed workflow, frontmatter spec, generation examples, and error handling for the craft-agent skill.

## Supported Agent Frontmatter

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `name` | string | Agent name (required) | — |
| `description` | string | Role description (required) | — |
| `tools` | list | Allowed tools (allowlist) | All tools |
| `disallowedTools` | list | Explicitly forbidden tools | — |
| `model` | string | Model override | Default model |
| `permissionMode` | string | `default` / `allowAll` / `bypassPermissions` | `default` |
| `maxTurns` | number | Maximum conversation turns | Unlimited |
| `skills` | list | Available skills | — |
| `mcpServers` | list | MCP servers to use | — |
| `hooks` | object | Agent-scoped hooks | — |
| `memory` | boolean | Persist context across sessions | `false` |
| `background` | boolean | Run without user input | `false` |
| `isolation` | string | `none` / `sandbox` | `none` |

## Permission Modes

| Mode | Behavior | Risk |
|------|----------|------|
| `default` | Standard permission checks | Low |
| `allowAll` | Auto-approve all tool uses | Medium |
| `bypassPermissions` | Skip permission checks entirely | **High** — requires explicit confirmation |

## Detailed Workflow

### Step 1 — Define Role

```
What role should this agent have?

Describe freely. Example:
  "I need a code review agent that focuses on security vulnerabilities
   and performance issues."
```

Extract: core role, specialization, tool needs, permission level.

### Step 2 — Tools and Permissions

```
Tools for this agent:

  Code review agent example:
    Allowed: Read, Glob, Grep, mcp__github__*
    Disallowed: Write, Bash (read-only role)

Approach:
  1. Allow specific tools only (recommended — least privilege)
  2. Disallow specific tools (disallowedTools)
  3. Allow all tools
```

MCP server access:
```
MCP servers needed?
  [Installed] github — available
  [Not installed] jira — install via /maencof:bridge first
```

### Step 3 — Advanced Settings

```
Advanced options (all optional):

  memory: Persist context across sessions [Yes/No]
  background: Run autonomously without user input [Yes/No]
  isolation: Run in sandbox environment [Yes/No]
  maxTurns: Limit conversation turns (default: unlimited)
```

- **memory: true** — context survives session end
- **background: true** — autonomous execution
- **isolation: sandbox** — filesystem isolation for safety
- **maxTurns** — prevents runaway loops

### Step 4 — Generate System Prompt

```
System prompt draft:
---
You are a code review specialist agent.

Primary responsibilities:
- Detect security vulnerabilities (SQL injection, XSS, auth bypass)
- Identify performance issues (N+1 queries, unnecessary loops, memory leaks)
- Evaluate code readability and maintainability

Output format:
[Severity: High/Medium/Low] filename:line — issue description
---

Edit or add anything?
```

### Step 5 — Generate Agent File

**Location**: `{CWD}/.claude/agents/{name}.md`

Example (`code-reviewer`):
```yaml
---
name: code-reviewer
description: Security and performance focused code review specialist
tools:
  - Read
  - Glob
  - Grep
  - mcp__github__get_pull_request
  - mcp__github__list_pull_request_files
disallowedTools:
  - Write
  - Bash
permissionMode: default
model: claude-opus-4-6
maxTurns: 20
---

You are a code review specialist agent.
...
```

### Step 6 — Confirmation and Usage Guide

```
Agent created!

  Location: .claude/agents/code-reviewer.md
  Role: Security & performance code review

Usage:
  Task(subagent_type="code-reviewer", prompt="Review PR #123")

Or in conversation:
  "Ask code-reviewer to review this PR"
```

## Agent Collaboration

Executed by the **configurator** agent. The configurator validates frontmatter fields, checks for tool/disallowedTools conflicts, and verifies MCP server availability.

## Usage Examples

```
/maencof:craft-agent
/maencof:craft-agent code-reviewer
```

Natural language:
```
"Create a test-writing agent"
"I need an agent that only reads files and searches code"
"Make a security audit agent with sandbox isolation"
```

## Error Handling

| Condition | Resolution |
|-----------|------------|
| Name conflict | Show existing agent, offer overwrite confirmation |
| Required MCP not installed | Route to `/maencof:bridge` |
| `bypassPermissions` selected | Security risk warning, require explicit confirmation |
| tools/disallowedTools conflict | Highlight conflicting entries, request resolution |
| Invalid model name | Display supported model list |
| sandbox + Write tool | Warn about sandbox write limitations |

## Acceptance Criteria

- Agent file created at `{CWD}/.claude/agents/{name}.md`
- Valid YAML frontmatter with all required fields
- No conflicts between `tools` and `disallowedTools`
- System prompt clearly defines role, responsibilities, and output format
- Referenced MCP servers verified as installed
- User confirmation at each decision point
