# lifecycle — Reference

Detailed workflow, dispatcher pattern, event/action specs, and error handling for the lifecycle skill.

## Dispatcher Pattern

```
hooks.json (static, Plugin Area — never modified)
  → lifecycle-dispatcher (maencof hook runtime)
    → lifecycle.json (dynamic, Execution Area — managed by this skill)
```

The dispatcher runtime (`src/hooks/lifecycle-dispatcher.ts`) reads `lifecycle.json` at hook invocation time — no restart required for changes to take effect.

## Supported Events

| Event | Fires When | Typical Use |
|-------|-----------|-------------|
| `SessionStart` | Session begins | Greeting, context loading |
| `UserPromptSubmit` | Before prompt processing | Reminders, validation |
| `PreToolUse` | Before tool execution | Warnings, confirmation |
| `PostToolUse` | After tool execution | Logging, post-processing |
| `Stop` | Claude response complete | Checklists, notifications |
| `SessionEnd` | Session closing | Cleanup, summaries |

## Action Types

| Type | Description | Config Fields |
|------|-------------|---------------|
| `echo` | Output a message | `message: string` |
| `remind` | Conditional reminder | `message: string`, `condition?: string` |
| `command` | Shell command (v2 reserved) | Pending security review |

## Matcher Field (PreToolUse / PostToolUse only)

For `PreToolUse` and `PostToolUse` events, use the `matcher` field to filter by tool name:

- **No matcher**: action fires for all tools
- **With matcher**: pipe-separated tool names (e.g., `"Write|Edit|Bash"`)
- Matcher values are exact tool name matches

## Detailed Workflow

### Step 1 — Display Registered Actions

Read `lifecycle.json` and display current actions:

```
Current lifecycle actions:

  [Active] greeting (SessionStart)
    "Hello! Have a great day"

  [Active] commit-reminder (Stop)
    "Did you write commit messages in English?" (condition: after git ops)

  [Inactive] session-summary (SessionEnd)
    "Saving today's work summary to maencof"

Total: 3 actions (2 active, 1 inactive)
```

### Step 2 — Identify Intent and Map to Event

| User Expression | Mapped Event |
|----------------|-------------|
| "When session starts", "on startup" | `SessionStart` |
| "Every time I ask", "on prompt" | `UserPromptSubmit` |
| "Before editing files", "before tool" | `PreToolUse` |
| "After each response", "when done" | `Stop` |
| "When session ends", "on close" | `SessionEnd` |

### Step 3 — Define Action

Collect action configuration:

```
Defining action:

  Event: SessionStart
  Type: echo
  Message: "Hello! Have a great day"
  Description: "Greeting at session start"

Register this action? [Yes / Edit]
```

For PreToolUse/PostToolUse, also collect the matcher:
```
  Matcher (optional): Which tools should trigger this?
    Example: Write|Edit  (fires only for Write or Edit tools)
    Leave empty for all tools.
```

### Step 4 — Update lifecycle.json

Write the action to `{CWD}/.maencof-meta/lifecycle.json`:

```json
{
  "version": 1,
  "actions": [
    {
      "id": "greeting",
      "event": "SessionStart",
      "enabled": true,
      "type": "echo",
      "config": { "message": "Hello! Have a great day" },
      "created_by": "user",
      "created_at": "2026-03-01T10:00:00Z",
      "description": "Greeting at session start"
    }
  ]
}
```

### Step 5 — Confirmation

```
Lifecycle action registered!

  ID: greeting
  Event: SessionStart
  Type: echo
  Status: Active

Applies from the next matching event.
Instant test: /maencof:lifecycle --test greeting
```

## Agent Collaboration

Executed by the **configurator** agent. The configurator validates action schemas and manages lifecycle.json writes.

## Usage Examples

```
/maencof:lifecycle add
/maencof:lifecycle list
/maencof:lifecycle disable commit-reminder
/maencof:lifecycle --test greeting
/maencof:lifecycle remove session-summary
```

Natural language:
```
"Greet me when the session starts"
"Remind me to write tests after every response"
"Warn me before any Bash command"
```

## Error Handling

| Condition | Resolution |
|-----------|------------|
| `lifecycle.json` missing | Check `.maencof-meta/`; auto-create if vault initialized; suggest `/maencof:setup` otherwise |
| JSON parse error | Create backup, offer regeneration, attempt action recovery |
| Duplicate ID | Show existing action, offer overwrite or new ID |
| `command` type requested | Inform v2 reservation, suggest echo/remind alternatives |
| Invalid event name | Display supported events table |
| Unclear condition expression | Request specific condition (tool name, keyword) |

## Acceptance Criteria

- Action persisted in `{CWD}/.maencof-meta/lifecycle.json`
- Valid schema: `version: 1`, well-formed action object
- Correct event mapping and optional matcher for tool events
- Enable/disable toggle works without removing the action
- User confirmation before any write
