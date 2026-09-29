# preToolUse

## Purpose

Observe selected native invocations for conditional workflow assistance, and restate the election at the first unbound file edit of a turn. Loaded by hooks/hooks.json; the bridge basename selects this entry.

## Conventions

- The matcher is `Bash|Edit|Write|NotebookEdit|apply_patch|mcp__plugin_seiri_tools__runtime`. It observes Bash, the file edit tools, and the `runtime` MCP tool's participation actions (`step`, `start`, `resume`, `pause`, `finish`); `dial` is not in `parseWorkflowRequest`'s whitelist and stays unobserved here.
- `apply_patch` never matches on Claude. On Codex the entry expands it through `expandEditInputs`, which calls `normalizeCodexToolUses` from the `@ogham/cross-platform` root, into one `Write` or `Edit` per added, updated, or moved-to file; every other tool call reaches `processToolStart` unchanged.
- An edit notice names only skills and a file count.

## Boundaries

### Always do

- Seed an absent, expired, or corrupt actor from the payload's native turn on an entry request or on a main actor's edit with no active binding; require the existing trusted anchor for every other invocation.
- Keep stdout empty except for an edit notice, and keep all failures nonblocking.

### Ask first

- Expand the observed tool surface beyond Bash, the file edit tools, `apply_patch`, and the runtime tool's participation actions.

### Never do

- Return permission decisions or create a task binding.
- Infer participation from a skill read or arbitrary prompt text.
- Observe or inject on a child actor's edit.
