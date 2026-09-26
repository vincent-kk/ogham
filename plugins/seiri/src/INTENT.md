# src — Seiri implementation

## Purpose

Implement host-specific rule deployment and optional workflow assistance. Repository checks own correctness; this layer preserves explicit participation and observed evidence.

## Structure

Public entry points declare named exports. The version constant is generated and must not be edited manually.

## Conventions

- Use ESM imports with .js extensions.
- Use @ogham/cross-platform for path operations.
- Resolve MCP host paths through the shared package; hooks use native payload provenance and supplied cwd.
- Hooks import concrete internal files, while shared packages are consumed through their public entry points.

## Boundaries

### Always do

- Keep new public modules reachable through named exports.
- Preview rule changes with the applicable host target and revision.
- Keep missing evidence distinct from successful verification.

### Ask first

- Add a new module boundary or change public signatures.

### Never do

- Edit generated version constants.
- Put executable logic in types or constants.
- Introduce cycles between core, MCP, and hooks.
