# workflow

## Purpose

Validate explicit optional workflow participation requests. Native hook provenance, not MCP arguments, authorizes actor state transitions.

## Boundaries

### Always do

- Require an absolute workspace path and path-safe task name.
- Distinguish request acceptance from the hook's activation acknowledgment.

### Ask first

- Expand actions or infer participation without an explicit request.

### Never do

- Guess host IDs from environment, transcripts, or model arguments.
- Create a ledger or certify task completion.
