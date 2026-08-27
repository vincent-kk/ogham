# lifecycle — Reference

Detailed workflow, dispatcher pattern, event/action specs, and error handling for the lifecycle skill.

## Dispatcher Pattern

```
hooks.json (static, Plugin Area — never modified)
  → lifecycle-dispatcher (maencof hook runtime)
    → lifecycle.json (dynamic, Execution Area — managed by this skill)
```

The dispatcher runtime (`src/hooks/lifecycleDispatcher/lifecycleDispatcher.ts`) reads `lifecycle.json` at hook invocation time — no restart required for changes to take effect.

## Supported Events

| Event              | Fires When               | Typical Use               |
| ------------------ | ------------------------ | ------------------------- |
| `SessionStart`     | Session begins           | Greeting, context loading |
| `UserPromptSubmit` | Before prompt processing | Reminders, validation     |
| `PreToolUse`       | Before tool execution    | Warnings, confirmation    |
| `PostToolUse`      | After tool execution     | Logging, post-processing  |

`Stop` is not supported — the plugin registers no Stop hook (per-turn process spawn cost). `SessionEnd` is retired — the plugin no longer registers a SessionEnd hook (session finalization lives in the MCP server lifecycle, which has no user-visible output channel); previously registered SessionEnd actions are ignored. Map "after each response" to `UserPromptSubmit` (next turn) and "when the session ends" to `SessionStart` (next session).

## Action Types

| Type      | Description                 | Config Fields                           |
| --------- | --------------------------- | --------------------------------------- |
| `echo`    | Output a message            | `message: string`                       |
| `remind`  | Conditional reminder        | `message: string`, `condition?: string` |
| `command` | Shell command (v2 reserved) | Pending security review                 |

## Matcher Field (PreToolUse / PostToolUse only)

For `PreToolUse` and `PostToolUse` events, use the `matcher` field to filter by tool name:

- **No matcher**: action fires for all tools
- **With matcher**: pipe-separated tool names (e.g., `"Write|Edit|Bash"`)
- Matcher values use one host-neutral vocabulary in both PreToolUse and PostToolUse: Claude `Edit` and Codex `apply_patch` are the same logical edit matcher; all other names (including `Bash` and MCP tools) remain exact identity matches
- Matcher decisions use `tool_name` only and never infer a tool from success/failure response content

## Detailed Workflow

### Step 2 — Identify Intent and Map to Event

| User Expression                       | Mapped Event                   |
| ------------------------------------- | ------------------------------ |
| "When session starts", "on startup"   | `SessionStart`                 |
| "Every time I ask", "on prompt"       | `UserPromptSubmit`             |
| "Before editing files", "before tool" | `PreToolUse`                   |
| "After each response", "when done"    | `UserPromptSubmit` (next turn) |
| "When session ends", "on close"       | `SessionStart` (next session)  |

### Step 3 — Define Action

Collect the event, action type, message, description, and optional condition. For `PreToolUse` and `PostToolUse`, also collect the optional pipe-separated `matcher`.

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
Instant test: use the `lifecycle` skill with `--test greeting`.
```

## Agent Collaboration

Executed by the **configurator** agent. The configurator validates action schemas and manages lifecycle.json writes.

## Error Handling

| Condition                    | Resolution                                                                                   |
| ---------------------------- | -------------------------------------------------------------------------------------------- |
| `lifecycle.json` missing     | Check `.maencof-meta/`; auto-create if vault initialized; suggest `/maencof:setup` otherwise |
| JSON parse error             | Create backup, offer regeneration, attempt action recovery                                   |
| Duplicate ID                 | Show existing action, offer overwrite or new ID                                              |
| `command` type requested     | Inform v2 reservation, suggest echo/remind alternatives                                      |
| Invalid event name           | Display supported events table                                                               |
| Unclear condition expression | Request specific condition (tool name, keyword)                                              |

## Acceptance Criteria

- Action persisted in `{CWD}/.maencof-meta/lifecycle.json`
- Valid schema: `version: 1`, well-formed action object
- Correct event mapping and optional matcher for tool events
- Enable/disable toggle works without removing the action
- User confirmation before any write
