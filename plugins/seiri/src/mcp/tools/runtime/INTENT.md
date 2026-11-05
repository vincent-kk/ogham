# runtime

Tool name is `runtime`; the participation state machine it drives is `workflow` (`core/sessionSignals/workflow`), which the `Workflow <task>` ACK reports.

## Purpose

Validate explicit optional session runtime requests: chain participation (`step`, `start`, `resume`, `pause`, `finish`) and the runtime dial valve (`dial`). Native hook provenance, not MCP arguments, authorizes actor state transitions; `dial` applies immediately, with no hook pair.

## Conventions

The tool name is runtime; workflow is the participation state machine. An accepted request is not proof that the native hooks activated it.

## Boundaries

### Always do

- Require an absolute workspace path and path-safe task name for participation actions.
- Distinguish request acceptance from the hook's activation acknowledgment.
- Keep `dial` free of invocation, ACK, or actor-file side effects.

### Ask first

- Expand actions or infer participation without an explicit request.

### Never do

- Guess host IDs from environment, transcripts, or model arguments.
- Create a ledger or certify task completion.
- Let `dial` write beyond the runtime valve and its seiri-owned ignore maintenance; the latter keeps session state out of commits and preserves user-owned ignore files.
