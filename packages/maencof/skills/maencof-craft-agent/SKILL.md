---
name: maencof-craft-agent
user_invocable: true
description: "[maencof:maencof-craft-agent] Creates, edits, validates, or lists Claude Code subagent definitions. Supports four modes: CREATE, EDIT, VALIDATE, and LIST for full agent lifecycle management."
version: "2.0.0"
complexity: complex
context_layers: []
orchestrator: configurator
plugin: maencof
---

# Subagent Constructor

## When to Use

### Auto-trigger Conditions

Claude automatically invokes this skill when:

- The user mentions creating a new agent, subagent, or custom Claude Code agent (CREATE)
- An existing agent needs modifications to its configuration or system prompt (EDIT)
- An agent specification needs compliance validation against the official spec (VALIDATE)
- The user needs to see available agents or check agent inventory (LIST)

### Manual Invocation

```
/maencof:maencof-craft-agent [request describing what to create/edit/validate/list]
```

## Overview

Systematic workflow for creating and managing Claude Code custom subagents. Produces specification-compliant `.md` files ready for deployment to `~/.claude/agents/` (user-level) or `.claude/agents/` (project-level).

## Operating Modes

### CREATE Mode

**Triggers**: "create agent", "new subagent", "build agent", "add agent"

1. **Gather Requirements**: Identify purpose, scope, and constraints
2. **Select Template**: Match to closest template (read-only, full-capability, domain-specialist, hook-validated)
3. **Configure Frontmatter**: Set name, description, tools, model, permissionMode, hooks, memory, skills
4. **Write System Prompt**: Craft focused instructions following design patterns
5. **Validate**: Run compliance checks against official specification
6. **Deploy**: Write file to target scope directory

### EDIT Mode

**Triggers**: "edit agent", "modify agent", "update agent", "change agent"

1. **Locate Agent**: Find existing agent file by name or path
2. **Analyze Current Config**: Parse frontmatter and system prompt
3. **Apply Changes**: Modify requested fields while preserving structure
4. **Validate**: Ensure changes maintain specification compliance
5. **Deploy**: Write updated file

### VALIDATE Mode

**Triggers**: "validate agent", "check agent", "verify agent"

1. **Parse File**: Extract YAML frontmatter and markdown body
2. **Check Required Fields**: Verify `name` and `description` exist
3. **Validate Tools**: Confirm all tools are from the official catalog
4. **Check Constraints**: Verify model values, permission modes, hook structure
5. **Report**: Output compliance report with issues and recommendations

### LIST Mode

**Triggers**: "list agents", "show agents", "inventory agents"

1. **Scan Directories**: Check `~/.claude/agents/` and `.claude/agents/`
2. **Parse Each Agent**: Extract name, description, model, tools
3. **Display Inventory**: Formatted table of all available agents

## Quick Reference

### Frontmatter Fields

| Field             | Required | Values                                                           |
| ----------------- | -------- | ---------------------------------------------------------------- |
| `name`            | Yes      | lowercase-hyphen-case                                            |
| `description`     | Yes      | When Claude should delegate (be specific)                        |
| `tools`           | No       | Tool names, comma-separated. Inherits all if omitted             |
| `disallowedTools` | No       | Tools to deny from inherited set                                 |
| `model`           | No       | `sonnet`, `opus`, `haiku`, `inherit` (default: `inherit`)        |
| `permissionMode`  | No       | `default`, `acceptEdits`, `dontAsk`, `bypassPermissions`, `plan` |
| `maxTurns`        | No       | Max agentic turns before stopping                                |
| `skills`          | No       | Skills to preload into agent context                             |
| `mcpServers`      | No       | MCP servers available to agent                                   |
| `hooks`           | No       | Lifecycle hooks scoped to agent                                  |
| `memory`          | No       | `user`, `project`, or `local` for persistent memory              |

### Available Tools

**Read-only**: Read, Grep, Glob, WebFetch, WebSearch
**Modification**: Edit, Write, NotebookEdit
**Execution**: Bash, Task
**Interaction**: AskUserQuestion
**Spawning**: Task(agent-name) to restrict which subagents can be spawned

### Model Selection Guide

| Use Case                         | Model     | Rationale                     |
| -------------------------------- | --------- | ----------------------------- |
| Fast lookups, simple scans       | `haiku`   | Low latency, cost-effective   |
| Standard implementation, reviews | `sonnet`  | Balanced capability and speed |
| Architecture, deep analysis      | `opus`    | Maximum reasoning capability  |
| Match parent conversation        | `inherit` | Context-appropriate (default) |

### Scope Deployment

| Location            | Scope                | Priority    |
| ------------------- | -------------------- | ----------- |
| `--agents` CLI flag | Current session only | 1 (highest) |
| `.claude/agents/`   | Current project      | 2           |
| `~/.claude/agents/` | All projects         | 3           |
| Plugin `agents/`    | Where plugin enabled | 4 (lowest)  |

## Design Principles

1. **Single Responsibility**: Each subagent excels at one specific task
2. **Minimal Tool Access**: Grant only necessary permissions
3. **Descriptive Descriptions**: Claude uses the description to decide delegation
4. **Proactive Triggers**: Include "use proactively" for auto-delegation
5. **Context Isolation**: Subagents preserve main conversation context
6. **No Nesting**: Subagents cannot spawn other subagents

## Resources

### reference.md

Complete specification reference covering all frontmatter fields, validation rules, tool catalog, permission inheritance, hook configuration, memory scopes, and CLI agent format.

Load when implementing complex configurations or resolving specification questions.

### examples.md

Production-ready subagent examples across categories: code reviewer, debugger, data scientist, test runner, documentation writer, security auditor, and database query validator with hooks.

Load when seeking implementation patterns or starting from a working example.

### knowledge/

Deep-dive topics:

- **frontmatter-spec.md**: Complete YAML frontmatter specification with field interactions
- **tool-catalog.md**: Full tool catalog with descriptions and restriction patterns
- **design-patterns.md**: Subagent design patterns and anti-patterns
- **hooks-integration.md**: Hook configuration for conditional tool validation

### templates/

Ready-to-customize templates:

- **read-only-agent.md**: Read-only analysis agent (no Write/Edit)
- **full-capability-agent.md**: Full tool access agent
- **domain-specialist.md**: Domain-specific expert agent
- **hook-validated-agent.md**: Agent with PreToolUse hook validation

## Validation Checklist

Before deployment, verify:

- [ ] `name` field: lowercase, hyphen-separated, unique
- [ ] `description` field: specific about when to delegate
- [ ] `tools` field: only official tool names, minimal necessary set
- [ ] `model` field: valid value or omitted (defaults to `inherit`)
- [ ] `permissionMode`: valid value if specified
- [ ] System prompt: focused, actionable, includes clear workflow
- [ ] No prompt injection vectors in system prompt
- [ ] File saved to correct scope directory
- [ ] File extension is `.md`

## Workflow Example

```
User: "Create a subagent that reviews TypeScript code for type safety"

1. Mode: CREATE
2. Template: read-only-agent (review = no modifications)
3. Frontmatter:
   - name: typescript-reviewer
   - description: Reviews TypeScript code for type safety, strict mode compliance, and proper type usage. Use proactively after writing TypeScript code.
   - tools: Read, Grep, Glob, Bash
   - model: sonnet
4. System prompt: Focused on TS type analysis workflow
5. Validate: All checks pass
6. Deploy: ~/.claude/agents/typescript-reviewer.md
```
