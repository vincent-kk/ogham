---
version: 0.1
status: stub
updated: 2026-04-06
---

# SPEC-state — `.imbas/` Directory Layout and Config Schema

## Purpose

Documents the on-disk state managed by imbas: the `.imbas/` directory tree, the
`ImbasConfigSchema` (Zod), and how each provider uses that state. Finalized in
Phase A-thick.

## Scope (to be expanded)

- Top-level `.imbas/` layout per provider.
- `ImbasConfigSchema` fields, including the new `provider` enum (`jira`/`github`/
  `local`, default `jira`).
- Local provider adds `issues/{stories,tasks,subtasks}/` under `.imbas/<KEY>/`.
- Config example for local mode.

## References

- `packages/imbas/src/types/config.ts`
- `.omc/plans/imbas-local-provider.md`
