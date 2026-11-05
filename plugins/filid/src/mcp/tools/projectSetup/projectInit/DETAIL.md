# project_setup init action contract

## Requirements

- Resolve the requested project root and create `.filid/config.json` only when it does not exist.
- Create config version 3 with automatic adapter selection by default.
- When adapter IDs are supplied, create explicit adapter selection preserving their order.
- Keep rule-document synchronization outside this action.
- Initialization explicitly records the built-in `verification.organNames` list in the default configuration.

## API Contracts

- The parent dispatcher resolves an optional project path; this child requires the resolved root.
- Existing configuration is never overwritten.

## Acceptance Criteria

### AC-project-init-v2 — Adapter-aware initialization

- Omitted adapter IDs create automatic selection.
- Non-empty adapter IDs create explicit selection in the requested order.
- An empty explicit adapter list is rejected.

### AC-project-init-preserve — Existing config

- Repeated initialization leaves the existing config byte content unchanged.

## Last Updated

Update when initialization ownership, config preservation, or adapter-selection policy changes.
