# reviewState

## Purpose

Own committed-change review preparation, file-level reuse, bounded reviewer rounds, independent verification, deterministic verdict publication, and PR handoff section generation.

## Conventions

- Ordinary host subagents read materialized briefs, write opinions, and call validation.
- Committed file identity and explicitly assigned judgment inputs determine reuse.
- Each generation keeps its own artifacts; the branch state identifies the active generation.
- Original opinion bytes and their provenance survive reuse and path projection.

## Boundaries

### Always do

- Recheck committed inputs before accepting validation or publishing a verdict.
- Retain unchanged file results independently of their original batch peers.
- Require completed, validated reviewer and verifier artifacts for reuse.
- Preserve unresolved findings until current verification explicitly resolves them.
- Apply group budgets to new reviewer work and keep effort stable during resume.
- Guard state publication against conflicts and late generation writers.
- Enforce project containment and symlink checks for artifacts and rule paths.
- Require literal confirmation for the cleanup action.

### Ask first

- Change state, opinion, rule-map, or report contracts outside approved scope.

### Never do

- Generate review findings or decide their truth in bookkeeping code.
- Apply fixes, commit, push, or operate PRs from this tool.
- Treat worktree content as committed input.
- Require a dedicated host agent, hook, access broker, or query receipt.
