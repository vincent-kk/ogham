# project_init contract

## Requirements

- Resolve the requested project root and create `.filid/config.json` only when it does not exist.
- Create config version 2 with automatic adapter selection by default.
- When adapter IDs are supplied, create explicit adapter selection preserving their order.
- Keep rule-document synchronization outside this tool.

## API Contracts

- Input: `{ path?: string, language?: string, adapterIds?: string[] }`.
- Output uses the common envelope; summary reports whether the config was created and its absolute path.
- Existing configuration is never overwritten.

## Acceptance Criteria

### AC-project-init-v2 — Adapter-aware initialization

- Omitted adapter IDs create automatic selection.
- Non-empty adapter IDs create explicit selection in the requested order.
- An empty explicit adapter list is rejected.

### AC-project-init-preserve — Existing config

- Repeated initialization leaves the existing config byte content unchanged.

## Last Updated

2026-07-26 — Added config v2 adapter selection input.
