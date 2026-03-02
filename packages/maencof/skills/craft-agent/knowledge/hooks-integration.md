# Hooks Integration

Configure lifecycle hooks for conditional validation and event-driven behavior in subagents.

---

## Hook Events in Subagent Frontmatter

Hooks defined in subagent frontmatter only run while that specific subagent is active.

| Event | Matcher Input | When It Fires |
|-------|--------------|---------------|
| `PreToolUse` | Tool name | Before subagent uses a tool |
| `PostToolUse` | Tool name | After subagent uses a tool |
| `Stop` | (none) | When subagent finishes |

`Stop` hooks are automatically converted to `SubagentStop` at runtime.

---

## Hook Structure

### Basic Format
```yaml
hooks:
  EventName:
    - matcher: "ToolNamePattern"
      hooks:
        - type: command
          command: "./path/to/script.sh"
```

### Multiple Matchers
```yaml
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-bash.sh"
    - matcher: "Write|Edit"
      hooks:
        - type: command
          command: "./scripts/validate-write.sh"
```

### Matcher Patterns
- Exact match: `"Bash"` matches only Bash tool
- OR pattern: `"Edit|Write"` matches Edit or Write
- No matcher: hook fires for all tool uses

---

## Hook Input

Hooks receive JSON via stdin. The structure depends on the event type.

### PreToolUse / PostToolUse Input
```json
{
  "tool_name": "Bash",
  "tool_input": {
    "command": "SELECT * FROM users WHERE id = 1"
  },
  "session_id": "abc-123",
  "cwd": "/path/to/project",
  "hook_event_name": "PreToolUse"
}
```

The `tool_input` contents vary by tool:
- **Bash**: `{ "command": "..." }`
- **Write**: `{ "file_path": "...", "content": "..." }`
- **Edit**: `{ "file_path": "...", "old_string": "...", "new_string": "..." }`
- **Read**: `{ "file_path": "..." }`

---

## Exit Codes

| Code | Behavior | Use Case |
|------|----------|----------|
| 0 | Allow - proceed normally | Validation passed |
| 1 | Error - hook failed (tool still proceeds) | Script error (non-blocking) |
| 2 | Block - prevent tool execution | Validation failed, feed stderr to Claude |

**Exit code 2** is the key mechanism for conditional tool blocking. The stderr output is sent back to Claude as feedback.

---

## Common Patterns

### Pattern 1: Read-Only SQL Validator

Block write SQL operations, allow only SELECT.

**Subagent frontmatter**:
```yaml
name: db-reader
tools: Bash
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-readonly-query.sh"
```

**Validation script**:
```bash
#!/bin/bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [ -z "$COMMAND" ]; then
  exit 0
fi

if echo "$COMMAND" | grep -iE '\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|REPLACE|MERGE)\b' > /dev/null; then
  echo "Blocked: Write operations not allowed. Use SELECT queries only." >&2
  exit 2
fi

exit 0
```

### Pattern 2: File Path Validator

Restrict file operations to specific directories.

```bash
#!/bin/bash
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only allow operations in src/ directory
if [[ "$FILE_PATH" != */src/* ]]; then
  echo "Blocked: Operations only allowed in src/ directory." >&2
  exit 2
fi

exit 0
```

### Pattern 3: Command Allowlist

Only allow specific commands.

```bash
#!/bin/bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

ALLOWED_COMMANDS="^(git diff|git log|git status|npm test|npm run lint)"

if ! echo "$COMMAND" | grep -E "$ALLOWED_COMMANDS" > /dev/null; then
  echo "Blocked: Only git and npm test/lint commands are allowed." >&2
  exit 2
fi

exit 0
```

### Pattern 4: Post-Edit Linter

Run linting after file edits.

```yaml
hooks:
  PostToolUse:
    - matcher: "Edit|Write"
      hooks:
        - type: command
          command: "./scripts/run-linter.sh"
```

```bash
#!/bin/bash
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Run appropriate linter based on file extension
case "$FILE_PATH" in
  *.ts|*.tsx) npx eslint "$FILE_PATH" --fix ;;
  *.py) python -m ruff check "$FILE_PATH" --fix ;;
  *.go) gofmt -w "$FILE_PATH" ;;
esac

exit 0
```

---

## Project-Level Subagent Events

Configure in `settings.json` to respond to subagent lifecycle in the main session.

| Event | Matcher Input | When It Fires |
|-------|--------------|---------------|
| `SubagentStart` | Agent type name | When subagent begins |
| `SubagentStop` | Agent type name | When subagent completes |

### Example: Setup/Teardown
```json
{
  "hooks": {
    "SubagentStart": [
      {
        "matcher": "db-agent",
        "hooks": [
          { "type": "command", "command": "./scripts/setup-db-connection.sh" }
        ]
      }
    ],
    "SubagentStop": [
      {
        "hooks": [
          { "type": "command", "command": "./scripts/cleanup.sh" }
        ]
      }
    ]
  }
}
```

---

## Script Requirements

### Make Scripts Executable
```bash
chmod +x ./scripts/validate-readonly-query.sh
```

### Dependencies
- `jq` for JSON parsing (install: `brew install jq` or `apt install jq`)
- Scripts receive JSON via stdin
- Scripts should handle empty/missing fields gracefully

### Error Handling
```bash
#!/bin/bash
# Always read stdin even if not needed
INPUT=$(cat)

# Safely extract fields with defaults
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)

# Handle jq not available
if ! command -v jq &> /dev/null; then
  echo "Warning: jq not installed, skipping validation" >&2
  exit 0
fi
```

---

## Testing Hooks

### Test PreToolUse Hook
```bash
echo '{"tool_name":"Bash","tool_input":{"command":"SELECT * FROM users"},"hook_event_name":"PreToolUse"}' | ./scripts/validate-readonly-query.sh
echo "Exit code: $?"
```

### Test with Blocked Command
```bash
echo '{"tool_name":"Bash","tool_input":{"command":"DROP TABLE users"},"hook_event_name":"PreToolUse"}' | ./scripts/validate-readonly-query.sh
echo "Exit code: $?"  # Should be 2
```
