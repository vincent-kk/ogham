---
version: 0.1
status: stub
updated: 2026-04-06
---

# SPEC-skills — Skill Routing and Reference Partitioning

## Purpose

Documents per-skill provider divergence, which skills are partitioned vs
inline-branched, the reference directory layout, and the verbatim SKILL.md
standard block. Finalized in Phase A-thick.

## Scope (to be expanded)

- Per-skill divergence table: 5 pinned (manifest, read-issue, digest, status,
  devplan) + 2 borderline (split, setup) + 4 untouched (validate, cache,
  fetch-media, pipeline).
- Reference directory layout standard: `skills/<skill>/references/{jira,local}/`.
- Standard SKILL.md anchor block (`<!-- imbas:constraints-v1 -->`) with verbatim
  Workflow + Constraints sections and the dispatch table.
- Threshold rule: partition iff per-provider delta > 15 lines.

## References

- `.omc/plans/imbas-local-provider.md`
