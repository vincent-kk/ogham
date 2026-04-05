---
version: 0.1
status: stub
updated: 2026-04-06
---

# SPEC-provider — Provider Abstraction Principle

## Purpose

Defines where and how imbas expresses the difference between issue-tracking providers
(`jira`, `github`, `local`). Finalized content lands in Phase A-thick; this file is
a deliberate stub created in Phase A-thin to anchor cross-references.

## Scope (to be expanded)

- Why provider abstraction lives in the skill/reference layer, not in TypeScript.
- Threshold rule for `partition` vs `inline branching` (15-line per-provider delta).
- Acknowledgement of the inline-branching precedent at
  `skills/manifest/references/workflow.md:55-72`.
- Explicit rejection of `IssueExecutor` TS class hierarchy with code-reality
  rationale (`src/types/manifest.ts` already provider-agnostic; `src/core/providers/`
  does not exist).
- Dispatch surface: the `<!-- imbas:constraints-v1 -->` anchor block in each
  pinned skill's SKILL.md.

## References

- Consensus plan: `.omc/plans/imbas-local-provider.md`
- GitHub follow-up: `.omc/plans/imbas-github-provider-handoff.md`
