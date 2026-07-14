---
name: personal-status
user_invocable: true
description: '[maencof:personal-status] Views, resolves, and toggles the personal context — transient user states and recent personal topics (.maencof-meta/personal-context.json) that the companion weaves into conversation as subtle care.'
argument-hint: '[--resolve <label>] [--enable|--disable]'
version: '1.0.0'
complexity: simple
context_layers: []
orchestrator: personal-status skill
plugin: maencof
---

# /maencof:personal-status

Inspect and control the personal context: `states` (transient conditions such as mood,
sleep, health, situation) and `topics` (recent personal topics — plans, concerns,
relationships, appointments). The companion captures these silently during
conversation via the `mcp__plugin_maencof_tools__capture_personal_context` MCP tool and
consumes them at session start as the `<personal-context>` block.

Silence is a conversational-tone contract, not data hiding — the data is
user-owned plain JSON, and this skill is the explicit inspection channel.

## When to Use This Skill

- See what the companion currently knows about the user's state and recent topics
- Close an entry the user reports as over ("감기 다 나았어", "그 고민은 정리됐어")
- Turn the whole subsystem on or off

## Default View (no arguments)

1. Read `.maencof-meta/personal-context.json` (vault root).
2. Render two compact tables:
   - **states** — label, kind, intensity, expires (`expiresAt`), evidence
   - **topics** — label, kind, status, due, last seen (`lastSeenAt`), touches
3. Annotate noteworthy entries:
   - states expiring within 3 days (fade out unless reinforced)
   - states with `reinforceCount` ≥ 4 or repeatedly extended toward the 60-day
     TTL ceiling → suggest promoting to an L1 identity document via
     `/maencof:remember` — a trait that persists that long is identity, not a
     transient state
4. Remind: captures made mid-session surface from the **next** session
   (session-once injection by design).

## --resolve <label>

1. Read the file and locate `<label>` among states first, then topics
   (match against `label`, falling back to `id`).
2. Call `mcp__plugin_maencof_tools__capture_personal_context` with
   `{ target: <'state'|'topic'>, action: 'resolve', label }`.
3. Report the outcome in one line. A resolved state is removed immediately;
   a resolved topic is kept out of injection and pruned after its retention
   period.

NEVER edit `states`/`topics` entries in the file directly — the MCP tool is the
only permitted channel (it owns dedup, caps, and lifecycle invariants).

## --enable / --disable

- Edit ONLY the `config.enabled` field of `.maencof-meta/personal-context.json`
  directly (config fields are skill-editable; entries are not — same split as
  insight-config).
- After `--disable`: the `<personal-context>` block stops injecting from the next
  session and `capture_personal_context` rejects mutations. Existing entries are kept
  untouched.

## Notes

- The file is provisioned automatically at session start and included in the
  vault auto-commit scope — state history lives in the vault's git history.
- It is intentionally invisible to `recall`/`explore`/`checkup` and maencof-lens:
  the personal context is operational context, not vault knowledge.
