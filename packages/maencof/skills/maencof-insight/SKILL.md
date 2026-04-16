---
name: maencof-insight
user_invocable: true
description: "[maencof:maencof-insight] Manages the auto-insight capture system: enables or disables capture, adjusts sensitivity thresholds, controls per-category allowlist (principle / refuted_premise / ephemeral_candidate), views recent insights, and edits the meta-prompt governing what gets recorded."
argument-hint: "[--recent] [--stats] [--sensitivity high|medium|low] [--enable|--disable] [--max N] [--category principle|refuted|ephemeral --accept|--reject]"
version: "1.1.0"
complexity: simple
context_layers: []
orchestrator: maencof-insight skill
plugin: maencof
---

# /maencof:maencof-insight

Manage the auto-insight capture system.

## When to Use This Skill

- Check the current auto-insight capture status (enabled/disabled, sensitivity)
- View recently captured insights from the current session or vault
- Adjust capture sensitivity (high/medium/low)
- Enable or disable auto-insight capture
- Set the maximum number of captures per session

## Options

### --recent
Show recent auto-captured insights (from current session's pending captures and vault search).

1. Read `.maencof-meta/pending-insight-notification.json` for current session captures
2. Use `mcp_t_kg_search` with tags `["auto-insight"]` and `max_results: 10` for recent vault entries
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
4. Confirm: "Insight capture sensitivity changed to {level}."

### --enable
Enable auto-insight capture.

1. Read config, set `enabled: true`, write config
2. Confirm: "Auto-insight capture enabled."

### --disable
Disable auto-insight capture.

1. Read config, set `enabled: false`, write config
2. Confirm: "Auto-insight capture disabled."

### --max <N>
Set maximum captures per session.

1. Read config, set `max_captures_per_session` to N, write config
2. Confirm: "Maximum captures per session changed to {N}."

### --category <principle|refuted|ephemeral> --accept|--reject

Control the per-category capture allowlist (`config.category_filter`). Orthogonal to `sensitivity` — both filters are combined with **AND** semantics (e.g., `sensitivity=high` still rejects `ephemeral_candidate` when `category_filter.ephemeral_candidate=false`).

Field mapping:

| `--category` argument | `config.category_filter` key | Default |
|-----------------------|-------------------------------|---------|
| `principle` | `principle` | `accept` (true) — principle/premise insights, long-term preservation value |
| `refuted` | `refuted_premise` | `reject` (false) — premises rejected in Socratic Phase 2.5.b |
| `ephemeral` | `ephemeral_candidate` | `reject` (false) — ToT discarded candidates, intermediate outputs |

Procedure:

1. Read config, set `category_filter.<key> = (--accept ? true : false)`, write config
2. Confirm: "Category {key} set to {accept|reject}."

**Live status.** Active filtering is enforced at capture time by the `capture_insight` MCP tool. When `config.category_filter.<key> = false`, matching `capture_insight` calls are rejected with an explanatory error (see `src/mcp/tools/maencof-capture-insight/maencof-capture-insight.ts` lines 63-71). The `insight-injector` hook surfaces the current `allowed-categories` list to Claude each turn for transparency, but does not drop injections itself.

## Default (no options)

Show current status in this order:

1. enabled / disabled
2. sensitivity (high / medium / low)
3. session captures / max captures
4. `category_filter` current values (principle, refuted_premise, ephemeral_candidate)

## Available MCP Tools

| Tool | Purpose |
|------|---------|
| `mcp_t_kg_search` | Search recent auto-insight documents by tag (`--recent` option) |

> Note: Config file operations (`.maencof-meta/insight-config.json`, `.maencof-meta/auto-insight-stats.json`, `.maencof-meta/pending-insight-notification.json`) use filesystem Read/Write tools, not maencof MCP tools.

## Error Handling

- **insight-config.json missing**: treat as default config (enabled: true, sensitivity: medium, max_captures_per_session: 10)
- **auto-insight-stats.json missing**: display zeros for all stats
- **pending-insight-notification.json missing**: treat as empty (no pending captures)
- **Invalid sensitivity value**: "Valid sensitivity values are high, medium, low."
- **Invalid --max value**: "Maximum captures must be a positive integer (>= 1)."
