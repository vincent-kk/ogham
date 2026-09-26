# userPromptSubmit — Turn authority and progress line

## Purpose

Establish the current native turn. Under standard/strict, keep an active binding active across turns and report its progress, never reporting a paused binding's task; under off/advisory, suspend previous participation instead. Skill selection belongs to the user or host, including whether a later request continues the same task.

## Conventions

- Under standard/strict, anchor the trusted turn without suspending an existing binding, and read the post-anchor snapshot for the progress line.
- Under off/advisory, revoke existing metadata and create no new anchor.
- Do not inspect prompt prose to infer task intent.
- Progress-line and chain-line rendering live in `hooks/shared/progressLine.ts`, shared with SubagentStart and PostToolUse.

## Boundaries

### Always do

- Anchor the current turn through the actor store, suspending only under off/advisory.
- Render the progress line from the same-transaction snapshot the anchor call returns.

### Ask first

- Change native-boundary authority or the injection contract.

### Never do

- Infer task intent from prompt prose, enumerate task ledgers, or start/resume a task automatically.
- Copy rule bodies or import internal barrels.
