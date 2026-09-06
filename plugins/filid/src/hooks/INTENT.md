# hooks

## Purpose

Implement lifecycle initialization, context pointers, and pre-tool document and structure validation.

## Conventions

- Loaded by the canonical hook registration; entry files adapt stdin and stdout.
- The official hook build bundles TypeScript entries for supported host runners.
- FCA judgments belong to the parent source layer, not independent hook policy.

## Boundaries

### Always do

- Validate the payload working directory before accessing project files.
- Keep public entries, canonical registration, and build entries synchronized.
- Regenerate runtime bundles after changing a handler.

### Ask first

- Change an existing lifecycle event or its host compatibility contract.

### Never do

- Add business logic to a process entry file.
- Write managed project rules from inside a hook.
- Enforce a dedicated review-agent capability or access broker.
