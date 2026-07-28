# settings page contract

## Requirements

- Render the current Filid config v2 and managed rule-document state without external assets.
- Preserve hidden config fields while editing `language`, rule overrides, and structure options.
- Store maximum depth at `structure.maxDepth`, peer overrides at
  `structure.additionalAllowedPeers`, organ names at
  `structure.additionalOrganNames`, and entry overrides under the selected
  adapter ID in `structure.entryPointOverrides`.
- Keep adapter selection intact unless the page exposes an explicit adapter
  control.
- Validate user-entered peer override JSON before sending `POST /save`.

## API Contracts

- The injected `SettingsPageState.config` and submitted `SaveBody.config`
  conform to config v2.
- Existing field element IDs remain stable for the 1.0 migration seam; their
  serialized meaning follows config v2.
- Every state-changing request includes the server-issued token query
  parameter.

## Acceptance Criteria

### AC-settings-v2-roundtrip — Config preservation

- Editing visible fields writes their config v2 structure locations.
- Adapter selection and unedited structure keys survive a save unchanged.

### AC-settings-validation — Invalid peer input

- Malformed peer override JSON prevents submission and identifies the field.

## Last Updated

2026-07-26 — Adopted Filid config v2 structure and adapter preservation.
