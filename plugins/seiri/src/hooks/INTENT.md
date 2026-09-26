# hooks — Native event observation

## Purpose

Observe trusted host boundaries and paired invocations for explicitly participating tasks. standard/strict SessionStart states the stable chain, an election line, and a rule/dial/drift summary as advisory text, never a forced skill call; other hooks report only task-scoped progress and, under strict, the chain line on turns with no active binding (none or paused). Hooks never block actions or inject rule bodies.

## Structure

Executable entries are bundled and registered by convention. Dormant entries are built but unregistered; wiring checks distinguish these from active event handlers.

## Conventions

- Import concrete internal files to preserve bundle limits; shared packages use their public entry points.
- Keep validation runtimes, MCP SDKs, and glob engines out of hook bundles.
- Select the host-specific runtime through compiler-generated adapters at build time; normalize that host's native IDs and pass vendor-neutral identities to core.
- Use portable path operations and native cwd rather than MCP host-path discovery.

## Boundaries

### Always do

- Fail open and report failures through logHookFailure.
- Leave stdout empty when off/advisory or no dial-scoped injection applies.
- Allow trusted boundaries to revoke existing state even when assistance is disabled.

### Ask first

- Add a hook, widen observation scope, or increase context injection.

### Never do

- Write deployed host rules, duplicate their text, or call MCP tools.
- Block, allow, or rewrite tool calls through hook decisions.
- Create observations under off/advisory, activate participation from Skill loading, or force a skill call from injected text.
