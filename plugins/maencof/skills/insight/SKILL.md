---
name: insight
user-invocable: false
description: 'Checks related knowledge before automatic insight capture and manages capture settings or recent records. Use when preserving a new insight or tuning capture; use organize for consolidation.'
argument-hint: '[--recent] [--stats] [--sensitivity high|medium|low] [--enable|--disable]'
version: '1.1.0'
complexity: simple
context_layers: []
orchestrator: insight skill
plugin: maencof
---

# /maencof:insight

Manage the auto-insight capture system.

## Capture Workflow

Load the Capture section of [insight-lifecycle.md](../.shared/insight-lifecycle.md) when an insight is detected. Read likely existing accounts before deciding whether the claim adds information. Skip duplicates; preserve novel conditions, exceptions and evidence through `mcp__plugin_maencof_tools__capture_insight`. Configuration and category gates apply before any automatic write. Consolidation belongs to `organize --insights`; `reflect --insights` previews its assessment.

## When to Use This Skill

- Check the current auto-insight capture status (enabled/disabled, sensitivity)
- View recently captured insights from the current session or vault
- Adjust capture sensitivity (high/medium/low)
- Enable or disable auto-insight capture
- Set the maximum number of captures per session

## Options

### --recent

Show pending notifications and a bounded sample of stored auto-captured insights. Pending notifications can include earlier sessions and are not an unprocessed-work ledger.

1. Read `.maencof-meta/pending-insight-notification.json` for unconsumed capture notifications; missing means empty, not no stored insights.
2. Use `mcp__plugin_maencof_tools__kg_search` with `seed: ["auto-insight"]` and `max_results: 10`, then `mcp__plugin_maencof_tools__read` to confirm creation dates when needed.
3. Label the search results as a ranked sample, not vault-wide chronological order. Show path, title, layer and verified date. For a complete consolidation preview, use `organize --insights` and its paginated inventory.

#### Cross-event handoff semantics

`pending-insight-notification.json` carries captured insights across the boundary between the turn that captured them (MCP `capture_insight` call) and the turn that surfaces them:

- **Turn N** — `capture_insight` writes/appends the insight payload to `pending-insight-notification.json`.
- **Turn N+1, UserPromptSubmit** — the `insight-injector` hook is NOT the consumer. It only reads `config.category_filter` to render the `allowed-categories` banner; it does not inspect or mutate the pending file.
- **Turn N+1, SessionStart (or next session's SessionStart if the session ended before the consumer ran)** — `session-start.ts` reads the pending notifications, surfaces them to Claude via `hookSpecificOutput.additionalContext` ("💡 지난 세션에서 … 자동 캡처했습니다"), and deletes the file.

A crash between capture (turn N) and consumption leaves the file intact; the next session's SessionStart will pick it up. There is no TTL — the file is one-shot and self-cleaning.

### --stats

Show auto-insight capture statistics.

1. Read `.maencof-meta/auto-insight-stats.json`
2. Display: total captured, L2 direct, L5 captured, L5→L2 promoted, L5 archived
3. Calculate precision estimate: promoted / (promoted + archived) if denominator > 0

### Configuration Updates

| Option               | Config key                 | Value                |
| -------------------- | -------------------------- | -------------------- |
| `--sensitivity LEVEL` | `sensitivity` | `high`, `medium`, or `low` |
| `--enable`           | `enabled`                  | `true`               |
| `--disable`          | `enabled`                  | `false`              |
| `--max <N>`          | `max_captures_per_session` | positive integer `N` |

For any row, read `.maencof-meta/insight-config.json`, update the selected key, write the config, and confirm the applied value.

### --category <principle|refuted|ephemeral> --accept|--reject

Control the per-category capture allowlist (`config.category_filter`). Orthogonal to `sensitivity` — both filters are combined with **AND** semantics (e.g., `sensitivity=high` still rejects `ephemeral_candidate` when `category_filter.ephemeral_candidate=false`).

Field mapping:

| `--category` argument | `config.category_filter` key | Default                                                                    |
| --------------------- | ---------------------------- | -------------------------------------------------------------------------- |
| `principle`           | `principle`                  | `accept` (true) — principle/premise insights, long-term preservation value |
| `refuted`             | `refuted_premise`            | `reject` (false) — premises rejected in Socratic Phase 2.5.b               |
| `ephemeral`           | `ephemeral_candidate`        | `reject` (false) — ToT discarded candidates, intermediate outputs          |

Procedure:

1. Read config, set `category_filter.<key> = (--accept ? true : false)`, write config
2. Confirm: "Category {key} set to {accept|reject}."

**Live status.** Active filtering is enforced at capture time by the `capture_insight` MCP tool. When `config.category_filter.<key> = false`, matching `capture_insight` calls are rejected with an explanatory error (see `src/mcp/tools/maencofCaptureInsight/maencofCaptureInsight.ts`). The `insight-injector` hook surfaces the current `allowed-categories` list to Claude each turn for transparency, but does not drop injections itself.

## Default (no options)

Show current status in this order:

1. enabled / disabled
2. sensitivity (high / medium / low)
3. session captures / max captures
4. `category_filter` current values (principle, refuted_premise, ephemeral_candidate)

## Available MCP Tools

| Tool                                   | Purpose                                                         |
| -------------------------------------- | --------------------------------------------------------------- |
| `mcp__plugin_maencof_tools__kg_search` | Find related knowledge or a bounded auto-insight sample |
| `mcp__plugin_maencof_tools__read` | Verify complete claims and capture dates |
| `mcp__plugin_maencof_tools__capture_insight` | Record novel automatic insights with capture-time gates |

> Note: Config file operations (`.maencof-meta/insight-config.json`, `.maencof-meta/auto-insight-stats.json`, `.maencof-meta/pending-insight-notification.json`) use filesystem Read/Write tools, not maencof MCP tools.

## Error Handling

- **insight-config.json missing**: treat as default config (enabled: true, sensitivity: medium, max_captures_per_session: 10)
- **auto-insight-stats.json missing**: display zeros for all stats
- **pending-insight-notification.json missing**: treat as empty (no pending captures)
- **Invalid sensitivity value**: "Valid sensitivity values are high, medium, low."
- **Invalid --max value**: "Maximum captures must be a positive integer (>= 1)."
