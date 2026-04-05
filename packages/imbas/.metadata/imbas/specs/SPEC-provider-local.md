---
version: 0.1
status: stub
updated: 2026-04-06
---

# SPEC-provider-local — Local Provider Executor

## Purpose

Specification for the `local` issue tracker provider. Stores Story/Task/Subtask
entities as markdown files with YAML frontmatter under
`.imbas/<KEY>/issues/{stories,tasks,subtasks}/`. Content finalized in Phase
A-thick; this stub anchors cross-references from Phase A-thin.

## Scope (to be transcribed in A-thick)

- Directory layout: `.imbas/<KEY>/issues/{stories,tasks,subtasks}/`.
- ID allocation: prefix-by-type (`S-<N>` / `T-<N>` / `ST-<N>`), directory scan
  + max + 1, allocate-then-write per item.
- `issue_ref` stores the ID string only; file path is derived.
- Markdown file format: YAML frontmatter + `## Description` + `## Digest`.
- Bidirectional link handling (both sides of a link record each other).
- Per-skill branch specs for read-issue, digest, status, cache, setup.
- Concurrent-writer scenario is out of v1 scope.

## References

- Consensus plan: `.omc/plans/imbas-local-provider.md`
