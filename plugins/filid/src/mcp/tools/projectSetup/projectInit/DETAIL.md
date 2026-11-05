# project_setup init action contract

## Requirements

- Initialize only an absent project config or a losslessly convertible v1/v2 config; initialization must not replace user choices with new defaults.
- Create config version 3 with automatic adapter selection by default.
- When adapter IDs are supplied, create explicit adapter selection preserving their order.
- Keep rule-document synchronization outside this action.
- Initialization explicitly records the built-in `verification.organNames` list in the default configuration.

## API Contracts

- The parent dispatcher resolves an optional project path; this child requires the resolved root.
- Persist a v1/v2 migration only when no key is discarded and the result passes the strict v3 schema. Preserve other existing files byte for byte so initialization cannot silently settle a policy-loss decision.

## Acceptance Criteria

### AC-project-init-v2 — Adapter-aware initialization

- Omitted adapter IDs create automatic selection.
- Non-empty adapter IDs create explicit selection in the requested order.
- An empty explicit adapter list is rejected.

### AC-project-init-preserve — Existing config

- Existing v3 files and v1/v2 files that discard keys or fail validation retain their original bytes. A lossless validated v1/v2 migration may change serialization once; subsequent initialization preserves the v3 bytes.

## Last Updated

Update when initialization ownership, config preservation, or adapter-selection policy changes.
