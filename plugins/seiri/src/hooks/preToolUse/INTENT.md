# preToolUse

## Purpose

Observe selected native invocations for conditional workflow assistance. Loaded by hooks/hooks.json; the bridge basename selects this entry.

## Conventions

- The matcher observes Bash and the `runtime` MCP tool's participation actions (`step`, `start`, `resume`, `pause`, `finish`); `dial` is not in `parseWorkflowRequest`'s whitelist and stays unobserved here.

## Boundaries

### Always do

- Require an existing trusted turn anchor before recording an invocation.
- Keep stdout empty and all failures nonblocking.

### Ask first

- Expand the observed tool surface beyond Bash and the runtime tool's participation actions.

### Never do

- Return permission decisions or create a task binding.
- Infer participation from a skill read or arbitrary prompt text.
