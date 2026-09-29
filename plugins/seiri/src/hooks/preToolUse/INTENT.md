# preToolUse

## Purpose

Observe selected native invocations for conditional workflow assistance. Loaded by hooks/hooks.json; the bridge basename selects this entry.

## Conventions

- The matcher is `Bash|mcp__plugin_seiri_tools__runtime`. It observes Bash and the `runtime` MCP tool's participation actions (`step`, `start`, `resume`, `pause`, `finish`); `dial` is not in `parseWorkflowRequest`'s whitelist and stays unobserved here.

## Boundaries

### Always do

- Seed an absent, expired, or corrupt actor from the payload's native turn on an entry request; require the existing trusted anchor for every other invocation.
- Keep stdout empty and all failures nonblocking.

### Ask first

- Expand the observed tool surface beyond Bash and the runtime tool's participation actions.

### Never do

- Return permission decisions or create a task binding.
- Infer participation from a skill read or arbitrary prompt text.
