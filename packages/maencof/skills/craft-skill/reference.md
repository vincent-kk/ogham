# craft-skill — Reference

Detailed workflow, frontmatter spec, generation examples, and error handling for the craft-skill skill.

## Supported Skill Frontmatter

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `name` | string | Skill name (required) | — |
| `description` | string | Skill description (required) | — |
| `argument-hint` | string | Argument hint (e.g., `<query>`) | — |
| `user_invocable` | boolean | User can invoke directly | `true` |
| `disable-model-invocation` | boolean | Run without model | `false` |
| `allowed-tools` | list | Allowed tool list | All tools |
| `model` | string | Model override | Default model |
| `context` | string | `fork` for independent context | — |
| `agent` | string | Delegate to named agent | — |
| `hooks` | object | Skill-scoped hook definitions | — |

## Detailed Workflow

### Step 1 — Identify Purpose

```
What kind of skill would you like to create?

Describe freely. Example:
  "I need a skill that analyzes PRs and summarizes review points"
```

Extract: core purpose, argument needs, expected output format.

### Step 2 — Invocation Settings

```
Who invokes this skill?

  1. User directly (user_invocable: true)
  2. Claude automatically (user_invocable: false)
  3. Both (default)
```

If arguments are needed:
```
Does this skill take arguments?
  Example: /maencof:pr-review <pr-number>
  → argument-hint: "<pr-number>"
```

### Step 3 — Tool Requirements

```
Required tools for this skill:
  [Built-in] Read, Write, Bash, Glob, Grep
  [MCP] mcp__github__get_pull_request

  mcp__github__* is required.
  Is GitHub MCP installed?
    [Installed] → Proceed
    [Not installed] → Install via /maencof:bridge
```

Optionally restrict tools via `allowed-tools`.

### Step 4 — Execution Context

```
Execution mode:

  1. Normal — runs within current conversation context
  2. Fork (context: fork) — independent context
  3. Agent (agent: {name}) — delegate to a specialized agent
```

Recommend `context: fork` for long-running or context-heavy tasks.

### Step 5 — Design Workflow (Conversational)

```
Let's design the execution steps together.

PR review skill example:
  1. Parse PR number from arguments
  2. Fetch PR info via mcp__github__get_pull_request
  3. Analyze changed files
  4. Summarize review points (security, performance, readability)
  5. Output as markdown

Does this flow look right? Any additions or changes?
```

### Step 6 — Generate SKILL.md and Supporting Files

**Location**: `{CWD}/.claude/skills/{name}/SKILL.md`

Example output (`pr-review`):
```yaml
---
name: pr-review
user_invocable: true
description: Analyze a GitHub PR and summarize review points
argument-hint: "<pr-number>"
allowed-tools:
  - mcp__github__get_pull_request
  - mcp__github__list_pull_request_files
  - Read
context: fork
version: 1.0.0
---
```

Supporting files (when needed):
- `{name}/prompt.md` — model prompt template
- `{name}/template.md` — output template
- `{name}/config.json` — skill configuration

### Step 7 — Test Guidance

```
Skill created!

  Location: .claude/skills/pr-review/SKILL.md

Test it:
  /maencof:pr-review 123

Troubleshoot:
  /maencof:configure --scan
```

## Agent Collaboration

Executed by the **configurator** agent. For skills referencing agents (`agent` field), the configurator validates that the named agent exists in `.claude/agents/`.

## Usage Examples

```
/maencof:craft-skill
/maencof:craft-skill pr-review
```

Natural language:
```
"Create a skill that summarizes Slack channels"
"I want a deployment automation skill"
"Make a skill for running our test suite with coverage"
```

## Error Handling

| Condition | Resolution |
|-----------|------------|
| Name conflict | Show existing skill, offer overwrite confirmation |
| Required MCP not installed | Route to `/maencof:bridge` for installation |
| Invalid frontmatter value | Show spec reference, suggest correction |
| Agent name mismatch | List installed agents, suggest closest match |
| `context: fork` unsupported | Fall back to normal execution with notice |

## Acceptance Criteria

- SKILL.md created at `{CWD}/.claude/skills/{name}/SKILL.md`
- Valid YAML frontmatter with all required fields
- Workflow steps clearly documented in markdown body
- Supporting files generated when needed
- Referenced tools and agents verified as available
- User confirmation at each decision point
