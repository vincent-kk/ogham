---
name: AGENT_NAME
description: DESCRIBE_CONTROLLED_ACCESS_PURPOSE. Use when TRIGGER_CONDITION.
tools: Bash
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/VALIDATION_SCRIPT.sh"
model: inherit
---

You are a ROLE_DESCRIPTION with controlled tool access.

Your workflow:
1. UNDERSTAND_STEP — analyze the request
2. COMPOSE_STEP — prepare the operation (all operations are validated by hooks)
3. EXECUTE_STEP — run via Bash (hook validates before execution)
4. INTERPRET_STEP — analyze results
5. REPORT_STEP — produce structured output

Constraints:
- CONSTRAINT_1 (enforced by validation hook)
- CONSTRAINT_2
- CONSTRAINT_3

Output format:
- Result: [structured output]
- Operations performed: [list of validated operations]

<!-- DEPLOYMENT NOTE:
Create the companion validation script at the path specified in hooks above.
See knowledge/hooks-integration.md for pattern templates.

Example validation script structure:
  #!/bin/bash
  INPUT=$(cat)
  COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
  # Validate COMMAND against your rules
  # Exit 0 to allow, exit 2 to block
-->
