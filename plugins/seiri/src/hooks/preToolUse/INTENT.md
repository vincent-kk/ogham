# preToolUse

## Purpose

Observe selected native invocations for conditional workflow assistance. Loaded by hooks/hooks.json; the bridge basename selects this entry.

## Boundaries

### Always do

- Require an existing trusted turn anchor before recording an invocation.
- Keep stdout empty and all failures nonblocking.

### Ask first

- Expand the observed tool surface beyond Bash and the workflow tool.

### Never do

- Return permission decisions or create a task binding.
- Infer participation from a skill read or arbitrary prompt text.
