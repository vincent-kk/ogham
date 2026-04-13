# Hooks Integration — Deep Dive

Practical hook patterns and testing methods for subagent lifecycle control.

For event types, handler types, and exit codes, see **reference.md Section 4**.

---

## Practical Hook Patterns

### Pattern 1: Read-Only SQL Validator

Ensure a database agent only runs SELECT statements.

```yaml
name: db-reader
description: Read-only database query agent. Use for data analysis without modification risk.
tools: Bash
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-readonly-sql.sh"
```

**validate-readonly-sql.sh:**
```bash
#!/bin/bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if echo "$COMMAND" | grep -iqE '(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE)'; then
  echo "Blocked: Only SELECT queries are allowed" >&2
  exit 2
fi
exit 0
```

### Pattern 2: File Path Validator

Restrict file modifications to specific directories.

```yaml
hooks:
  PreToolUse:
    - matcher: "Edit|Write"
      hooks:
        - type: command
          command: "./scripts/validate-file-path.sh"
```

**validate-file-path.sh:**
```bash
#!/bin/bash
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty')

if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

if [[ "$FILE_PATH" != */src/* ]]; then
  echo "Blocked: Can only modify files in src/ directory" >&2
  exit 2
fi
exit 0
```

### Pattern 3: Command Allowlist

Restrict shell commands to a known-safe set.

```yaml
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-command.sh"
```

**validate-command.sh:**
```bash
#!/bin/bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

ALLOWED_PREFIXES=("git " "npm " "npx " "node " "cat " "ls " "echo ")

for prefix in "${ALLOWED_PREFIXES[@]}"; do
  if [[ "$COMMAND" == "$prefix"* ]]; then
    exit 0
  fi
done

echo "Blocked: Command not in allowlist" >&2
exit 2
```

### Pattern 4: Post-Edit Linter

Auto-lint files after modification.

```yaml
hooks:
  PostToolUse:
    - matcher: "Edit|Write"
      hooks:
        - type: command
          command: "./scripts/run-linter.sh"
```

**run-linter.sh:**
```bash
#!/bin/bash
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty')

if [[ "$FILE_PATH" == *.ts ]] || [[ "$FILE_PATH" == *.tsx ]]; then
  npx eslint --fix "$FILE_PATH" 2>/dev/null
elif [[ "$FILE_PATH" == *.py ]]; then
  python3 -m black "$FILE_PATH" 2>/dev/null
fi

exit 0
```

### Pattern 5: Prompt-Based Validation

Use Claude itself to evaluate tool input before execution.

```yaml
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: prompt
          prompt: "Evaluate if this command is safe and appropriate for the task. Return JSON with {\"decision\": \"allow\"} or {\"decision\": \"block\", \"reason\": \"...\"}"
          timeout: 15
```

### Pattern 6: Agent-Based Review

Spawn a reviewer subagent to validate complex operations.

```yaml
hooks:
  PreToolUse:
    - matcher: "Write"
      hooks:
        - type: agent
          agent: code-safety-reviewer
          timeout: 30
```

### Pattern 7: JSON Decision Response

Use the full JSON response schema to control tool execution with context injection.

**validate-with-context.sh:**
```bash
#!/bin/bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if echo "$COMMAND" | grep -q 'rm -rf'; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "Destructive command blocked by hook"
    }
  }'
else
  jq -n --arg ctx "Environment: $(hostname)" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      additionalContext: $ctx
    }
  }'
fi
```

### Pattern 8: Input Modification

Modify tool input before execution (e.g., enforce flags).

```bash
#!/bin/bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [[ "$COMMAND" == npm\ test* ]] && [[ "$COMMAND" != *--coverage* ]]; then
  jq -n --arg cmd "$COMMAND --coverage" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      updatedInput: { command: $cmd }
    }
  }'
else
  exit 0
fi
```

---

## Project-Level Subagent Hooks

Monitor subagent lifecycle from the project settings level (not inside the subagent):

```json
{
  "hooks": {
    "SubagentStart": [
      {
        "matcher": "security-scanner",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Security scan started' >> /tmp/audit.log"
          }
        ]
      }
    ],
    "SubagentStop": [
      {
        "matcher": "security-scanner",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Security scan completed' >> /tmp/audit.log"
          }
        ]
      }
    ]
  }
}
```

---

## Hook Script Requirements

1. **Executable permission**: `chmod +x scripts/*.sh`
2. **Read JSON from stdin**: Use `INPUT=$(cat)` then `jq` to parse
3. **Exit code discipline**: 0 = allow, 2 = block, other = warning
4. **stderr for messages**: Error messages go to stderr, JSON responses to stdout
5. **Timeout awareness**: Default 600s for command type. Keep scripts fast.
6. **No interactive input**: Scripts must run non-interactively

---

## Testing Hooks

### Test PreToolUse hook locally

```bash
# Simulate Bash tool input
echo '{"tool_name": "Bash", "tool_input": {"command": "SELECT * FROM users"}}' | ./scripts/validate-readonly-sql.sh
echo "Exit code: $?"

# Expect: exit 0 (SELECT is allowed)
```

```bash
# Simulate blocked command
echo '{"tool_name": "Bash", "tool_input": {"command": "DROP TABLE users"}}' | ./scripts/validate-readonly-sql.sh
echo "Exit code: $?"

# Expect: exit 2 (destructive command blocked)
```

### Test PostToolUse hook

```bash
echo '{"tool_name": "Edit", "tool_input": {"file_path": "/project/src/app.ts"}}' | ./scripts/run-linter.sh
echo "Exit code: $?"
```

### Debug with verbose mode

Run Claude Code with `--verbose` flag to see hook execution details:
```bash
claude --verbose
```

Hook stderr output appears in verbose logs, helping diagnose why hooks block or allow.
