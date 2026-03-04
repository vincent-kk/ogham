---
name: insight
user_invocable: true
description: Manage auto-insight capture settings, view recent captures, and edit meta-prompt
version: 1.0.0
complexity: simple
context_layers: []
orchestrator: insight skill
plugin: maencof
---

# /maencof:insight

Manage the auto-insight capture system.

## Options

### --recent
Show recent auto-captured insights (from current session's pending captures and vault search).

1. Read `.maencof-meta/pending-insight-notification.json` for current session captures
2. Use `kg_search` with tags `["auto-insight"]` and `max_results: 10` for recent vault entries
3. Display list with path, title, layer, and creation date

### --stats
Show auto-insight capture statistics.

1. Read `.maencof-meta/auto-insight-stats.json`
2. Display: total captured, L2 direct, L5 captured, L5→L2 promoted, L5 archived
3. Calculate precision estimate: promoted / (promoted + archived) if denominator > 0

### --sensitivity <high|medium|low>
Adjust capture sensitivity.

1. Read current config from `.maencof-meta/insight-config.json`
2. Update `sensitivity` field to the specified level
3. Write updated config back
4. Confirm: "인사이트 캡처 민감도를 {level}로 변경했습니다."

### --enable
Enable auto-insight capture.

1. Read config, set `enabled: true`, write config
2. Confirm: "인사이트 자동 캡처를 활성화했습니다."

### --disable
Disable auto-insight capture.

1. Read config, set `enabled: false`, write config
2. Confirm: "인사이트 자동 캡처를 비활성화했습니다."

### --max <N>
Set maximum captures per session.

1. Read config, set `max_captures_per_session` to N, write config
2. Confirm: "세션당 최대 캡처 수를 {N}으로 변경했습니다."

## Default (no options)
Show current status: enabled/disabled, sensitivity, session captures, max captures.

## Available MCP Tools

| Tool | Purpose |
|------|---------|
| `kg_search` | Search recent auto-insight documents by tag (`--recent` option) |

> Note: Config file operations (`.maencof-meta/insight-config.json`, `.maencof-meta/auto-insight-stats.json`, `.maencof-meta/pending-insight-notification.json`) use filesystem Read/Write tools, not maencof MCP tools.

## Error Handling

- **insight-config.json missing**: treat as default config (enabled: true, sensitivity: medium, max_captures_per_session: 5)
- **auto-insight-stats.json missing**: display zeros for all stats
- **pending-insight-notification.json missing**: treat as empty (no pending captures)
- **Invalid sensitivity value**: "유효한 민감도 값은 high, medium, low입니다."
- **Invalid --max value**: "최대 캡처 수는 1 이상의 정수여야 합니다."
