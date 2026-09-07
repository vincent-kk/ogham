# project_setup settings action contract

## Requirements

- Start or reuse a token-protected loopback settings server for one project.
- Concurrent calls share the in-flight startup. A different project waits for startup and replacement; an older server's close callback cannot clear its successor.
- Load config v2, or the in-memory v1 migration result with diagnostics, into the page state.
- Validate and persist only config v2 save bodies through configLoader.
- Preserve managed rule-document selection and resynchronization behavior.
- Bound each wait and return a resumable URL when the form is still pending.

## API Contracts

- Input: `{ path?: string, waitSeconds?: number }`.
- Entry point exposes the handler, `OpenSettingsOutput`, and its `SaveSummary` component type so the dispatcher can describe the returned save result. Server startup inputs and page payload types remain internal.
- Output uses the common envelope; summary preserves saved/closed/pending, URL, message and optional save summary.
- `SettingsPageState` includes project root, config existence, config v2, config diagnostics, and rule-document status.
- `SaveBody.config` is strict config v2; unknown or legacy keys are rejected.

## Acceptance Criteria

### AC-open-settings-v2 — State and persistence

- Missing config yields a valid v2 default state.
- A v1 config is exposed as migrated v2 state with migration diagnostics.
- A valid save writes v2 and settles the bounded waiter as saved.

### AC-open-settings-guard — Local session boundary

- Missing or incorrect session tokens are rejected.
- Wait timeout returns a reusable pending URL.
- Overlapping calls for one project open one browser tab and use the same server. Failed startup releases the in-flight slot for retry.

## History

- 2026-09-05 — Moved the unchanged settings-session payload behind `project_setup` action `settings`.
- 2026-07-26 — Moved settings state and saves to config v2.

## Last Updated

2026-09-05
