# tools — Explicit settings, evidence, and participation

## Purpose

Provide distinct contracts for configuration, task ledgers, and workflow requests. These tools do not inspect or edit application code.

## Conventions

- Browser and headless settings use the same core preview/apply functions.
- Extend settings actions for settings concerns; task evidence and participation remain separate contracts.
- Runtime config actions write the untracked valve; previewed settings determine baseline writes.
- Canonical MCP addresses use the full plugin namespace and compiler opt-in.
- Workflow project_root is required and absolute; native actor identity is never a model argument.

## Boundaries

### Always do

- Reuse an existing compatible action before expanding the tool surface.
- Keep ledger creation and command execution outside gates.
- Leave workflow state changes to paired native hooks.

### Ask first

- Add a tool or change an established action contract.

### Never do

- Add code inspection or editing capabilities.
- Require hooks to invoke MCP.
- Treat a lifecycle finish as proof that a task passed verification.
