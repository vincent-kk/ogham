---
name: maencof-craft-agent
user_invocable: true
description: "[maencof:maencof-craft-agent] Creates, edits, validates, or lists Claude Code subagent definitions. Supports four modes: CREATE, EDIT, VALIDATE, and LIST for full agent lifecycle management."
argument-hint: "[request describing what to create/edit/validate/list]"
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

## Operating Modes

### CREATE Mode

**Triggers**: "create agent", "new subagent", "build agent", "add agent"

1. **Gather Requirements**: Identify purpose, scope, and constraints
2. **Design Persona**: Craft role, judgment criteria, boundaries, and failure modes (see knowledge/persona-crafting.md)
3. **Separate Concerns**: Keep perspective (identity, values, judgment) in agent; extract reusable procedures into skills
4. **Select Template**: Match to closest template (read-only, full-capability, domain-specialist, hook-validated)
5. **Configure Frontmatter**: Set name, description, tools, model, permissionMode, hooks, memory, skills
6. **Write System Prompt**: Build focused instructions following persona patterns
7. **Validate**: Run compliance checks against official specification
8. **Deploy**: Write file to target scope directory

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
5. **Assess Prompt Quality**: Verify system prompt includes specific role (not "helpful assistant"), judgment criteria or value priorities (not just procedural steps), and at least one failure mode or boundary
6. **Check Description Triggers**: Verify description includes specific trigger conditions; recommend `<example>` blocks for complex delegation logic
7. **Report**: Output compliance report with issues and recommendations

### LIST Mode

**Triggers**: "list agents", "show agents", "inventory agents"

1. **Scan Directories**: Check `~/.claude/agents/` and `.claude/agents/`
2. **Parse Each Agent**: Extract name, description, model, tools
3. **Display Inventory**: Formatted table of all available agents

## Quick Reference

### Frontmatter Fields

| Field | Required | Description |
| --- | --- | --- |
| `name` | Yes | Unique identifier, lowercase-hyphen-case |
| `description` | Yes | When Claude should delegate — be specific |
| `tools` | No | Allowlist of tool names (comma-separated). Inherits all if omitted |
| `disallowedTools` | No | Denylist of tools from inherited set |
| `model` | No | `sonnet`, `opus`, `haiku`, full model ID, or `inherit` (default) |
| `permissionMode` | No | `default`, `acceptEdits`, `auto`, `dontAsk`, `bypassPermissions`, `plan` |
| `maxTurns` | No | Max agentic turns before stopping |
| `skills` | No | Skills to preload into agent context |
| `mcpServers` | No | MCP servers available to agent |
| `hooks` | No | Lifecycle hooks scoped to agent |
| `memory` | No | Persistent memory scope: `user`, `project`, or `local` |
| `background` | No | Always run as background task (boolean, default: false) |
| `effort` | No | Reasoning depth: `low`, `medium`, `high`, `max` |
| `isolation` | No | `worktree` for isolated Git worktree execution |
| `color` | No | UI color: `red`, `blue`, `green`, `yellow`, `purple`, `orange`, `pink`, `cyan` |
| `initialPrompt` | No | Auto-submitted first user turn when run via `--agent` |

See **reference.md** Section 1 for complete field specifications and interaction rules.

### Model Selection Guide

| Use Case | Model | Rationale |
| --- | --- | --- |
| Fast lookups, simple scans | `haiku` | Low latency, cost-effective |
| Standard implementation, reviews | `sonnet` | Balanced capability and speed |
| Architecture, deep analysis | `opus` | Maximum reasoning capability |
| Match parent conversation | `inherit` | Context-appropriate (default) |

### Scope Deployment

| Location | Scope | Priority |
| --- | --- | --- |
| Managed settings | Organization-wide | 1 (highest) |
| `--agents` CLI flag | Current session only | 2 |
| `.claude/agents/` | Current project | 3 |
| `~/.claude/agents/` | All projects | 4 |
| Plugin `agents/` | Where plugin enabled | 5 (lowest) |

### Invocation Methods

| Method | Description |
| --- | --- |
| Automatic delegation | Claude matches task to subagent's `description` |
| Natural language | Name the subagent in the prompt |
| `@-mention` | `@"agent-name (agent)"` — guarantees the subagent runs |
| `--agent` flag | `claude --agent <name>` — whole session uses subagent's config |
| `/agents` command | Interactive UI to create, edit, delete, and list subagents |

## Design Principles

1. **Single Responsibility**: Each subagent excels at one specific task
2. **Minimal Tool Access**: Grant only necessary permissions
3. **Descriptive Descriptions**: Claude uses the description to decide delegation
4. **Strong Persona**: Define clear role, judgment criteria, boundaries, failure modes, and output format
5. **Context Isolation**: Subagents receive only their system prompt + task — no parent history
6. **No Nesting**: Subagents cannot spawn other subagents (Agent Teams can coordinate across separate sessions)
7. **Stop Hook Conversion**: `Stop` hooks in frontmatter are auto-converted to `SubagentStop` at runtime

## Resources

### reference.md

Complete specification reference covering all frontmatter fields with interaction rules, full tool catalog, permission mode behaviors, hook event types and handler configuration, memory scopes, validation rules, and mode-specific workflows.

Load when implementing configurations, resolving specification questions, or performing validation.

### examples.md

Production-ready subagent examples across categories: code reviewer, debugger, data scientist, test runner with hooks, API developer with skills, security auditor with memory, task coordinator, and CLI-defined agent.

Load when seeking implementation patterns or starting from a working example.

### knowledge/

Deep-dive topics for advanced subagent engineering:

- **persona-crafting.md**: How to write effective personas — role declaration, judgment criteria, value priorities, failure modes, perspective/behavior separation, and model-specific calibration
- **frontmatter-spec.md**: Field interaction rules, validation logic, and CLI agent format
- **tool-catalog.md**: Tool restriction patterns, context-dependent availability, and common combinations
- **design-patterns.md**: 10 design patterns (including perspective/behavior separation), anti-patterns, and decision matrix for template selection
- **hooks-integration.md**: Practical hook patterns (SQL validator, path validator, command allowlist, linter) and testing methods

### templates/

Ready-to-customize templates with placeholder variables:

- **read-only-agent.md**: Read-only analysis agent (Read, Grep, Glob only)
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
- [ ] System prompt: focused persona with clear role, boundaries, and workflow
- [ ] System prompt: includes judgment criteria, not just procedural steps
- [ ] System prompt: at least one failure mode explicitly addressed
- [ ] Reusable procedures extracted to skills (if applicable)
- [ ] `description` field: `<example>` blocks for complex delegation (recommended)
- [ ] No prompt injection vectors in system prompt
- [ ] File saved to correct scope directory
- [ ] File extension is `.md`

## Workflow Example

```
User: "Create a subagent that reviews TypeScript code for type safety"

1. Mode: CREATE
2. Persona: Security-focused TS type analyst with structured review workflow
3. Template: read-only-agent (review = no modifications)
4. Frontmatter:
   - name: typescript-reviewer
   - description: Reviews TypeScript code for type safety, strict mode
     compliance, and proper type usage. Use proactively after writing
     TypeScript code.
   - tools: Read, Grep, Glob
   - model: sonnet
5. System prompt: Role + responsibilities + numbered workflow + output format
6. Validate: All checks pass
7. Deploy: ~/.claude/agents/typescript-reviewer.md
```
