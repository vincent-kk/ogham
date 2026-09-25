# core — Owned state

## Purpose

Own configuration, deployed-rule state, actor-scoped participation, and task ledgers. Repository tests and policy determine correctness; core stores context and observed evidence.

## Conventions

- Shared helpers belong at their consumers' common owner; single-owner helpers stay with that owner.
- Create untracked state through ensureSeiriDir and respect user-owned ignore files.
- Resolve repository roots without spawning git for each hook.
- Use atomic state writes and acquire locks before mutation.
- Preserve raw-byte rule hashes; delegate deployment revisions to @ogham/agent-artifacts.

## Boundaries

### Always do

- Keep hook-reachable code free of validation runtimes.
- Pair deployed-rule writes with a dry-run preview.
- Keep actor participation separate from durable task evidence.

### Ask first

- Introduce another kind of state.
- Change public signatures consumed by MCP and hooks.

### Never do

- Invent repository verification commands or thresholds.
- Mirror deployed-rule state into configuration.
- Activate a workflow from legacy session signals.
