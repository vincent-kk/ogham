---
name: maencof-dailynote
user_invocable: true
description: "[maencof:maencof-dailynote] Displays the daily maencof activity log for today or a past date, showing tool calls, document changes, and session lifecycle events to review knowledge management history."
argument-hint: "[--date YYYY-MM-DD] [--days N]"
version: "1.0.0"
complexity: simple
context_layers: []
orchestrator: maencof-dailynote skill
plugin: maencof
---

# maencof-dailynote — Daily Activity Log

Views the maencof activity log for today (or a specified date).
Shows tool calls, document changes, and session events automatically recorded by maencof.

## When to Use This Skill

- Check what happened in maencof today
- View the activity history for a specific date
- Review activity patterns over the past few days

## Workflow

### Step 1 — Parse Arguments

Parse query conditions from user input.

- Date: `--date=YYYY-MM-DD` (default: today)
- Last N days: `--days=N` (default: 1, max: 30)
- Category filter: `--category=document|search|index|config|session|diagnostic`
- No arguments: show all activities for today

### Step 2 — Call dailynote_read

Call the MCP tool `mcp_t_dailynote_read` to fetch results.

```
mcp_t_dailynote_read({
  date: "<parsed date or undefined>",
  last_days: <parsed days or undefined>,
  category: "<parsed category or undefined>"
})
```

### Step 3 — Display Results

Display results in a readable format.

- Group entries by date
- Each entry includes time, category, description, and path
- If no entries found, display "No activities recorded for the given date."
- Show total entry count as a summary at the bottom

## Output Format

```markdown
## Dailynote — 2026-03-02

| Time | Category | Activity | Path |
|------|----------|----------|------|
| 09:15 | session | Session started | — |
| 09:16 | document | Document created (L2) | 02_Derived/... |

> Total: 2 activities recorded.
```

## Available MCP Tools

| Tool | Purpose |
|------|---------|
| `mcp_t_dailynote_read` | Read daily activity log entries |

## Error Handling

- Vault not initialized: "Vault is not initialized. Please run `/maencof:maencof-setup`."
- Dailynote file not found: return empty result (not an error)
