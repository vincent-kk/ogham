# Subagent Constructor Reference

Complete specification reference for Claude Code custom subagents. This is the authoritative source for all field definitions, tool catalogs, and validation rules.

---

## Table of Contents

1. [YAML Frontmatter Specification](#1-yaml-frontmatter-specification)
2. [Tool Catalog](#2-tool-catalog)
3. [Permission Modes](#3-permission-modes)
4. [Hook Configuration](#4-hook-configuration)
5. [Memory Configuration](#5-memory-configuration)
6. [Model Selection and Inheritance](#6-model-selection-and-inheritance)
7. [Skills Injection](#7-skills-injection)
8. [MCP Server Configuration](#8-mcp-server-configuration)
9. [Scope and Priority](#9-scope-and-priority)
10. [Agent Tool Mechanics](#10-agent-tool-mechanics)
11. [Validation Rules](#11-validation-rules)
12. [Mode Workflows](#12-mode-workflows)

---

## 1. YAML Frontmatter Specification

All subagent `.md` files begin with a YAML frontmatter block delimited by `---`.

### Required Fields

**`name`** (string)
- Unique identifier for the subagent
- Format: lowercase letters and hyphens only (`/^[a-z][a-z0-9-]*$/`)
- Must be unique across all loaded agent sources
- Examples: `code-reviewer`, `test-runner`, `security-auditor`

**`description`** (string)
- Tells Claude WHEN to delegate to this subagent
- Be specific about trigger conditions — vague descriptions cause mis-delegation
- Include "Use proactively" for auto-delegation without user request
- Supports `<example>` blocks for precise trigger calibration (see below)
- Good: "Reviews TypeScript code for type safety issues. Use proactively after writing TypeScript files."
- Bad: "A helpful code reviewer"

**Description `<example>` blocks** (optional):

Embed structured examples in the description to improve trigger accuracy:

```yaml
description: >
  Reviews code for security vulnerabilities. Use proactively after
  writing code that handles user input.

  <example>
  Context: User just implemented a login endpoint
  user: "Check this for security issues"
  assistant: "I'll delegate to the security-reviewer subagent."
  <commentary>
  Triggers because the task involves security review of user input handling code.
  </commentary>
  </example>
```

### Optional Fields

**`tools`** (comma-separated string)
- Allowlist of tools the subagent can use
- If omitted, inherits ALL tools from the parent conversation
- Format: `tools: Read, Grep, Glob, Bash`
- Supports MCP tools: `mcp__<server>__<tool>`
- Supports Agent restriction: `Agent(worker, researcher)` limits which subagent types can be spawned

**`disallowedTools`** (comma-separated string)
- Denylist of tools from the inherited set
- Takes precedence over `tools` if both specified
- Format: `disallowedTools: Write, Edit, Bash`

**`model`** (string)
- AI model to use for this subagent
- Values: `sonnet`, `opus`, `haiku`, full model ID (e.g., `claude-opus-4-6`), or `inherit`
- Default: `inherit` (uses parent's model)

**`permissionMode`** (string)
- Controls how tool permissions are handled
- Values: `default`, `acceptEdits`, `auto`, `dontAsk`, `bypassPermissions`, `plan`
- See [Section 3](#3-permission-modes) for detailed behavior

**`maxTurns`** (number)
- Maximum agentic turns before the subagent stops
- When reached, subagent returns accumulated results to parent

**`skills`** (list)
- Skills to preload into the subagent's context at startup
- Format: YAML list of skill names
- Preloaded skills count toward the subagent's context window

**`mcpServers`** (list)
- MCP servers available to the subagent
- Format: string references to configured servers, or inline definitions
- See [Section 8](#8-mcp-server-configuration)

**`hooks`** (object)
- Lifecycle hooks scoped to this subagent
- Structure mirrors global hook configuration
- See [Section 4](#4-hook-configuration)

**`memory`** (string)
- Enable persistent memory for this subagent
- Values: `user`, `project`, `local`
- See [Section 5](#5-memory-configuration)

**`background`** (boolean)
- When `true`, always runs as a background task
- Default: `false`
- Background agents cannot prompt the user — unapproved tools are auto-denied

**`effort`** (string)
- Reasoning depth override
- Values: `low`, `medium`, `high`, `max`
- `max` is for Opus 4.6 only
- Higher effort = deeper analysis but slower and more expensive

**`isolation`** (string)
- Set to `worktree` for execution in a temporary Git worktree
- The worktree is auto-cleaned if no changes are made
- If changes exist, worktree path and branch are returned to parent

**`color`** (string)
- UI display color for visual identification
- Values: `red`, `blue`, `green`, `yellow`, `purple`, `orange`, `pink`, `cyan`

**`initialPrompt`** (string)
- Auto-submitted as the first user turn when running via `--agent` flag
- Supports command/skill references
- Only meaningful for session-level agents (`claude --agent <name>`)

### Plugin Restrictions

Subagents defined in plugins have these fields **ignored** for security:
- `hooks`
- `mcpServers`
- `permissionMode`

---

## 2. Tool Catalog

Complete list of tools available in Claude Code.

### Core Tools

| Tool | Category | Permission | Description |
| --- | --- | --- | --- |
| Read | Read-only | No | Read file contents |
| Grep | Read-only | No | Search file contents (ripgrep) |
| Glob | Read-only | No | Pattern-based file search |
| Edit | Modification | Yes | String replacement in files |
| Write | Modification | Yes | Create/overwrite files |
| NotebookEdit | Modification | Yes | Modify Jupyter notebook cells |
| Bash | Execution | Yes | Execute shell commands |
| Agent | Spawning | No | Spawn subagents |
| AskUserQuestion | Interaction | No | Multi-select questions to user |
| WebFetch | Network | Yes | Fetch URL content |
| WebSearch | Network | Yes | Web search |
| Skill | Execution | Yes | Execute a skill |

### Session Management Tools

| Tool | Permission | Description |
| --- | --- | --- |
| TaskCreate | No | Create task in task list |
| TaskGet | No | Get task details |
| TaskList | No | List all tasks |
| TaskUpdate | No | Update task status/details |
| TaskOutput | No | Read background task output (deprecated) |
| TaskStop | No | Stop running background task |
| TodoWrite | No | Session task checklist (SDK/non-interactive only — not available in standard Claude Code sessions) |
| CronCreate | No | Create scheduled task in session |
| CronDelete | No | Cancel scheduled task |
| CronList | No | List scheduled tasks |

### Remote Trigger Tools

| Tool | Permission | Description |
| --- | --- | --- |
| RemoteTrigger | No | Call the claude.ai remote-trigger API (list, get, create, update, run triggers) |

### Navigation and Intelligence Tools

| Tool | Permission | Description |
| --- | --- | --- |
| LSP | No | Code intelligence (go-to-definition, find references, type info) |
| ToolSearch | No | Search and load deferred tools |
| EnterPlanMode | No | Switch to plan mode |
| ExitPlanMode | Yes | Exit plan mode with plan |
| EnterWorktree | No | Create isolated Git worktree |
| ExitWorktree | No | Exit worktree session |

### MCP and Resource Tools

| Tool | Permission | Description |
| --- | --- | --- |
| ListMcpResourcesTool | No | List connected MCP server resources |
| ReadMcpResourceTool | No | Read specific MCP resource URI |

### Collaboration Tools (Experimental)

Require `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`:

| Tool | Permission | Description |
| --- | --- | --- |
| SendMessage | No | Message teammate or resume subagent |
| TeamCreate | No | Create agent team |
| TeamDelete | No | Disband agent team |

### Platform-Specific Tools

| Tool | Permission | Description |
| --- | --- | --- |
| PowerShell | Yes | Windows PowerShell commands (preview) |

### Tool Restriction Syntax

```yaml
# Allowlist — only these tools available
tools: Read, Grep, Glob

# Denylist — inherit all except these
disallowedTools: Write, Edit, Bash

# Restrict which subagent types can be spawned
tools: Agent(worker, researcher), Read, Bash

# Include MCP tools
tools: Read, Grep, mcp__database__query, mcp__slack__post_message
```

---

## 3. Permission Modes

| Mode | Behavior |
| --- | --- |
| `default` | Standard — prompts user for each sensitive tool use |
| `acceptEdits` | Auto-approves file operations (Read/Edit/Write/mkdir/rm/mv). Protected directories excluded. Other tools use standard prompts |
| `auto` | AI-powered 2-stage classifier judges user intent alignment. Escalates to human after 3 consecutive denials or 20 cumulative. **Research preview** |
| `dontAsk` | Auto-denies tools not on allowlist. For locked-down environments |
| `bypassPermissions` | All tools auto-approved. `.git`, `.claude`, `.vscode`, `.idea`, `.husky` writes still confirmed. **Container/VM only** |
| `plan` | Read-only. Cannot modify files or execute commands |

### Inheritance Rules

- Parent `bypassPermissions` → subagent `permissionMode` ignored (parent wins)
- Parent `auto` mode → subagent inherits auto, frontmatter `permissionMode` ignored
- Evaluation order: **deny → ask → allow** (deny always wins)

---

## 4. Hook Configuration

### Event Types

| Event | When | Matcher |
| --- | --- | --- |
| `PreToolUse` | Before tool execution | Tool name (regex) |
| `PostToolUse` | After successful tool execution | Tool name (regex) |
| `PostToolUseFailure` | After failed tool execution | Tool name (regex) |
| `SubagentStart` | Subagent spawned | Agent type name |
| `SubagentStop` | Subagent completed | Agent type name |
| `Stop` | Claude response complete. In frontmatter, auto-converted to `SubagentStop` | none |
| `StopFailure` | API error ends turn | `rate_limit`, `authentication_failed`, `billing_error`, `invalid_request`, `server_error`, `max_output_tokens`, `unknown` |
| `SessionStart` | Session start/resume | `startup`, `resume`, `clear`, `compact` |
| `SessionEnd` | Session end | `clear`, `resume`, `logout`, `prompt_input_exit`, `bypass_permissions_disabled`, `other` |
| `UserPromptSubmit` | User submits prompt | none |
| `InstructionsLoaded` | CLAUDE.md loaded | `session_start`, `nested_traversal`, `path_glob_match`, `include`, `compact` |
| `PermissionRequest` | Permission dialog shown | Tool name (regex) |
| `PermissionDenied` | Auto mode denies tool | Tool name (regex) |
| `TaskCreated` | TaskCreate called | none |
| `TaskCompleted` | Task marked complete | none |
| `TeammateIdle` | Team agent idle | none |
| `ConfigChange` | Settings file changed | `user_settings`, `project_settings`, `local_settings`, `policy_settings`, `skills` |
| `CwdChanged` | Working directory changed | none |
| `FileChanged` | Watched file changed | filename (basename) |
| `PreCompact` | Before context compression | `manual`, `auto` |
| `PostCompact` | After compression | `manual`, `auto` |
| `WorktreeCreate` | Worktree created | none |
| `WorktreeRemove` | Worktree removed | none |
| `Elicitation` | MCP server input request | MCP server name |
| `ElicitationResult` | User elicitation response | MCP server name |
| `Notification` | System notification sent | `permission_prompt`, `idle_prompt`, `auth_success`, `elicitation_dialog` |

### Handler Types

| Type | Description |
| --- | --- |
| `command` | Execute shell script. Receives JSON via stdin |
| `http` | Send HTTP POST request |
| `prompt` | Feed JSON input as Claude prompt |
| `agent` | Invoke subagent for evaluation |

### Hook Input Schema (Common Fields)

All hook handlers receive JSON via stdin with these common fields:

| Field | Description |
| --- | --- |
| `session_id` | Current session identifier |
| `transcript_path` | Path to conversation JSONL |
| `cwd` | Current working directory |
| `permission_mode` | Current permission mode (not all events) |
| `hook_event_name` | Name of fired event |
| `agent_id` | (Subagent calls only) Unique subagent identifier |
| `agent_type` | (Subagent calls or --agent) Agent name |

Tool events additionally include: `tool_name`, `tool_input`, `tool_use_id`.

### Common Handler Fields (All Types)

| Field | Required | Description |
| --- | --- | --- |
| `type` | Yes | `command`, `http`, `prompt`, `agent` |
| `if` | No | Conditional filter: `"Bash(git *)"`, `"Edit(*.ts)"` — tool events only |
| `timeout` | No | Seconds (command: 600, prompt: 30, agent: 60) |
| `statusMessage` | No | Custom spinner message |
| `once` | No | Skills only: run once per session |

### Command Hook Fields

| Field | Required | Description |
| --- | --- | --- |
| `command` | Yes | Shell command to execute. Supports `$TOOL_INPUT` variable for tool events |
| `async` | No | Run in background (boolean, default: false) |
| `shell` | No | `"bash"` (default) or `"powershell"` |

### HTTP Hook Fields

| Field | Required | Description |
| --- | --- | --- |
| `url` | Yes | POST endpoint URL |
| `headers` | No | HTTP headers object (supports `$ENV_VAR` interpolation) |
| `allowedEnvVars` | No | Array of env var names allowed in header interpolation |

HTTP response handling:
- `2xx` + empty body: success (equivalent to exit 0)
- `2xx` + plain text: success, text added as context
- `2xx` + JSON: success, parsed as hook output
- `non-2xx` or connection failure: non-blocking error, execution continues
- To signal a blocking error, return `2xx` with JSON containing the appropriate decision fields

### Prompt Hook Fields

| Field | Required | Description |
| --- | --- | --- |
| `prompt` | Yes | Prompt text with `$ARGUMENTS` placeholder for hook input |
| `model` | No | Model override for evaluation |

### Agent Hook Fields

| Field | Required | Description |
| --- | --- | --- |
| `prompt` | Yes | Prompt text with `$ARGUMENTS` placeholder for hook input |
| `model` | No | Model override for evaluation |

### Exit Codes (command type)

| Code | Meaning | Action |
| --- | --- | --- |
| 0 | Success | Parse stdout JSON; allow operation |
| 2 | Blocking error | Use stderr as error message; block operation (only for events that support blocking — see table below) |
| Other | Non-blocking | Show stderr in verbose mode; continue |

### Hook Output Schema

#### Universal JSON Output Fields

All hook handlers can return these fields via stdout JSON (exit code 0):

| Field | Default | Description |
| --- | --- | --- |
| `continue` | `true` | If false, Claude stops processing entirely |
| `stopReason` | — | Message shown to user when continue=false |
| `suppressOutput` | `false` | Hide stdout from verbose mode output |
| `systemMessage` | — | Warning message shown to user |

#### PreToolUse Decision Control

Return JSON with `hookSpecificOutput` to control whether the tool call proceeds:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow|deny|ask|defer",
    "permissionDecisionReason": "Explanation for decision",
    "updatedInput": { "command": "modified command" },
    "additionalContext": "Extra context injected into Claude's conversation"
  }
}
```

| Field | Values | Description |
| --- | --- | --- |
| `permissionDecision` | `allow`, `deny`, `ask`, `defer` | Whether to allow, deny, prompt user, or defer the tool call |
| `permissionDecisionReason` | string | For allow/ask: shown to user. For deny: shown to Claude |
| `updatedInput` | object | Modifies tool input parameters before execution |
| `additionalContext` | string | String added to Claude's context before tool executes |

Decision precedence when multiple hooks return different decisions: **deny > defer > ask > allow**

`defer` (v2.1.89+): Returns the tool call as deferred. On session resume, the hook fires again and can allow or defer further.

#### PostToolUse Decision Control

```json
{
  "decision": "block",
  "reason": "Explanation shown to Claude",
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "Additional context for Claude"
  }
}
```

#### PermissionRequest Decision Control

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PermissionRequest",
    "decision": {
      "behavior": "allow|deny",
      "updatedInput": {},
      "updatedPermissions": []
    }
  }
}
```

Hook output injected into context is capped at **10,000 characters**. Exceeding this saves output to file with a path reference.

### Blocking Capability by Event

| Event | Can Block (exit 2) | Effect |
| --- | --- | --- |
| `PreToolUse` | Yes | Blocks tool call |
| `PermissionRequest` | Yes | Denies permission |
| `UserPromptSubmit` | Yes | Blocks prompt, erases from context |
| `Stop` | Yes | Prevents Claude from stopping |
| `SubagentStop` | Yes | Prevents subagent from stopping |
| `TeammateIdle` | Yes | Prevents teammate from going idle |
| `TaskCreated` | Yes | Rolls back task creation |
| `TaskCompleted` | Yes | Prevents task completion |
| `ConfigChange` | Yes | Blocks config change (except policy_settings) |
| `Elicitation` | Yes | Denies elicitation |
| `ElicitationResult` | Yes | Blocks response (becomes decline) |
| `WorktreeCreate` | Yes | Fails worktree creation |
| All others | No | stderr shown in verbose mode only |

### Frontmatter Hook Example

```yaml
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-command.sh"
  PostToolUse:
    - matcher: "Edit|Write"
      hooks:
        - type: command
          command: "./scripts/run-linter.sh"
```

### Environment Variables in Hooks

| Variable | Description |
| --- | --- |
| `CLAUDE_PROJECT_DIR` | Project root directory |
| `CLAUDE_PLUGIN_ROOT` | Plugin installation directory |
| `CLAUDE_PLUGIN_DATA` | Plugin persistent data directory |
| `CLAUDE_ENV_FILE` | Environment variable persistence file |
| `CLAUDE_CODE_REMOTE` | `"true"` on web, unset locally |

---

## 5. Memory Configuration

### Scopes

| Scope | Storage Path | Use Case |
| --- | --- | --- |
| `user` | `~/.claude/agent-memory/<agent-name>/` | Cross-project knowledge |
| `project` | `.claude/agent-memory/<agent-name>/` | VCS-shareable, **recommended default** |
| `local` | `.claude/agent-memory-local/<agent-name>/` | Project-specific, VCS-excluded |

### Behavior When Enabled

- System prompt auto-includes memory read/write instructions
- `MEMORY.md` index loaded into context (first 200 lines or 25KB)
- Read, Write, Edit tools auto-enabled regardless of `tools` field
- Agent builds knowledge over sessions through structured memory files

### Memory File Format

```markdown
---
name: memory-topic
description: One-line description for relevance matching
type: user | feedback | project | reference
---

Memory content here.
```

---

## 6. Model Selection and Inheritance

### Resolution Priority (highest to lowest)

1. `CLAUDE_CODE_SUBAGENT_MODEL` environment variable
2. `model` parameter in Agent tool call
3. `model` field in subagent frontmatter
4. Parent conversation's model (implicit `inherit`)

### Model Capabilities

| Model | Context | Max Output | Best For |
| --- | --- | --- | --- |
| `haiku` | 200K | 8K | Fast lookups, simple scans, high-volume tasks |
| `sonnet` | 200K | 16K | Standard implementation, reviews, balanced work |
| `opus` | 1M | 64-128K | Architecture, deep analysis, complex reasoning |

---

## 7. Skills Injection

```yaml
skills:
  - coding-standards
  - git-workflow
```

- Skills are fully loaded into the subagent's context at startup
- Each skill consumes context window space
- Use sparingly — only inject skills the subagent actively needs
- Shared behavior across agents should use skills rather than duplicated prompts

---

## 8. MCP Server Configuration

### Reference by Name

```yaml
mcpServers:
  - database-server
  - slack-server
```

References servers configured in the parent's settings.

### Inline Definition

```yaml
mcpServers:
  - name: custom-server
    command: node
    args: ["./mcp-server.js"]
    env:
      API_KEY: "${API_KEY}"
```

### MCP Tool Naming

MCP tools follow the pattern `mcp__<server-name>__<tool-name>`:
```yaml
tools: Read, Grep, mcp__database__query, mcp__database__list_tables
```

---

## 9. Scope and Priority

### Agent File Resolution

| Priority | Location | Scope | Notes |
| --- | --- | --- | --- |
| 1 (highest) | Managed settings | Organization-wide | MDM/managed deployment |
| 2 | `--agents` CLI flag | Current session | JSON format |
| 3 | `.claude/agents/` | Current project | Interactive or manual |
| 4 | `~/.claude/agents/` | All projects | Interactive or manual |
| 5 (lowest) | Plugin `agents/` | Where plugin enabled | Restricted fields |

Same-name agents: higher priority wins. `--add-dir` directories are NOT searched for agents.

### Disabling Specific Subagents

Add `Agent(subagent-name)` to `permissions.deny` in settings to prevent Claude from using a specific subagent:

```json
{
  "permissions": {
    "deny": ["Agent(Explore)", "Agent(my-custom-agent)"]
  }
}
```

Works for both built-in and custom subagents. Also available via CLI: `claude --disallowedTools "Agent(Explore)"`

### CLI Agent Definition

```bash
claude --agents '{
  "code-reviewer": {
    "description": "Expert code reviewer...",
    "prompt": "You are a senior code reviewer...",
    "tools": ["Read", "Grep", "Glob", "Bash"],
    "model": "sonnet"
  }
}'
```

### Session-Level Agent

```bash
claude --agent code-reviewer
```

The subagent's system prompt **fully replaces** the default Claude Code system prompt. CLAUDE.md and project memory still load normally.

---

## 10. Agent Tool Mechanics

### Spawning Process

1. Parent Claude calls Agent tool with subagent type and task prompt
2. Subagent starts in an **isolated context window**
3. Subagent receives: its system prompt + base environment info + task prompt
4. Parent's conversation history, system prompt, and tool outputs are **NOT passed**

### Key Constraints

- Subagents **cannot spawn other subagents** (no nesting)
- On completion, only a summary is returned to the parent (not full transcript)
- `maxTurns` reached → automatic stop with accumulated results

### Agent Teams Integration

Subagent definitions from any scope (project, user, plugin, CLI) are also available to [agent teams](https://code.claude.com/docs/en/agent-teams). When spawning a teammate, you can reference a subagent type and the teammate inherits its system prompt, tools, and model. This is distinct from subagent delegation — agent teams coordinate across separate sessions with direct inter-agent communication via `SendMessage`.

### Foreground vs Background

| Aspect | Foreground | Background |
| --- | --- | --- |
| Blocks parent | Yes | No |
| User prompts | Forwarded to user | Auto-denied |
| Permission prompts | Forwarded to user | Pre-requested or auto-denied |
| Switching | — | Ctrl+B to toggle |

### Transcript Storage

- Path: `~/.claude/projects/{project}/{sessionId}/subagents/agent-{agentId}.jsonl`
- Not affected by main conversation compression
- Auto-cleaned per `cleanupPeriodDays` setting (default: 30 days)

---

## 11. Validation Rules

### Compliance Check

1. File extension is `.md`
2. YAML frontmatter starts with `---` and ends with `---`
3. `name` field present, lowercase hyphen-case
4. `description` field present, specific trigger conditions
5. `tools` contains only official tool names (see Section 2)
6. `disallowedTools` contains only official tool names
7. `model` is valid value: `sonnet`, `opus`, `haiku`, full ID, `inherit`, or omitted
8. `permissionMode` is valid value or omitted
9. `hooks` structure matches event/handler schema
10. `memory` is `user`, `project`, `local`, or omitted
11. System prompt includes role identity, judgment criteria (value priorities or tradeoff rules), and at least one failure mode — not just procedural steps
12. No prompt injection vectors in system prompt
13. Reusable procedures extracted to skills where applicable (perspective/behavior separation)
14. Description includes `<example>` blocks for non-trivial delegation triggers (recommended)

### Common Validation Failures

| Issue | Fix |
| --- | --- |
| Name contains uppercase | Convert to lowercase hyphen-case |
| Description too vague | Add specific trigger conditions and context |
| Unknown tool name | Check Section 2 catalog; verify MCP tool format |
| Invalid model value | Use `sonnet`, `opus`, `haiku`, or `inherit` |
| Hook event not recognized | Check Section 4 event table |

---

## 12. Mode Workflows

### CREATE Workflow

```
Phase 1: Gather requirements → purpose, scope, constraints
Phase 2: Design persona → role, judgment criteria, boundaries, failure modes
         (Load knowledge/persona-crafting.md for guidance)
Phase 3: Separate concerns → keep perspective in agent; extract reusable procedures into skills
         (See knowledge/persona-crafting.md Section 6 and knowledge/design-patterns.md Pattern 10)
Phase 4: Select template → match to templates/
Phase 5: Configure frontmatter → set all relevant fields
Phase 6: Write system prompt → build focused instructions
Phase 7: Validate → run compliance checks against specification
Phase 8: Deploy → write to target scope directory
```

### EDIT Workflow

```
Phase 1: Locate → find agent file by name or path
Phase 2: Analyze → parse current frontmatter and prompt
Phase 3: Apply → modify fields, preserve structure
Phase 4: Validate → 12-point check
Phase 5: Deploy → write updated file
```

### VALIDATE Workflow

```
Phase 1: Parse → extract YAML and markdown body
Phase 2: Required fields → name + description
Phase 3: Tools → verify against catalog
Phase 4: Constraints → model, permissions, hooks, memory
Phase 5: Report → issues + recommendations
```

### LIST Workflow

```
Phase 1: Scan → ~/.claude/agents/ and .claude/agents/
Phase 2: Parse → extract name, description, model, tools
Phase 3: Display → formatted inventory table
```
