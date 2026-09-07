# hooks

## Purpose

Own the canonical lifecycle hook registration. Host adapters and runtime bundles are generated from this contract.

## Conventions

- Loaded by the plugin manifest; the canonical event matcher selects the bridge entry.
- The official plugin compiler generates host adapters. Edit the canonical registration and TypeScript source.
- Shared host runners own process startup and platform differences.

## Boundaries

### Always do

- Keep registration and build entries synchronized.
- Remove stale bundles through the official build when a hook is retired.

### Ask first

- Change event matchers or timeouts beyond an approved feature change.

### Never do

- Put implementation code or inline scripts in the registration.
- Edit generated host adapters or runtime bundles directly.
- Add review-specific agent interception to incremental review.
