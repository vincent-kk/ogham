# sessionTouch

## Purpose

Per-turn session activity recorder. Updates `lastActivityAt`/`usageSnapshot` on the day-log record and reopens sweep-mis-closed sessions, so session finalization can move off the SessionEnd hook onto the MCP server sweep.

## Boundaries

### Always do

- Gate on `isMaencofVault` and `session_id` presence
- Delegate all record mutation to `core/sessionStore` (`touchSessionActivity`)

### Ask first

- Recording additional per-turn fields

### Never do

- Close sessions here (sweep/shutdown owns `endedAt`)
- Emit user-visible output (side-effect only)
