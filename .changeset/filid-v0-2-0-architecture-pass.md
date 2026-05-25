---
"@ogham/filid": major
---

Architecture Pass (v0.2.0) — structural cleanup and breaking changes per
`.omc/plans/filid-structural-fix-round1.md` Stage 3.

## Breaking changes

- **`structure_validate` MCP tool**: `fix` input field removed. The no-op
  placeholder is eliminated; structural remediation must be performed via the
  `restructurer` agent under `/filid:restructure` or `/filid:sync`. Callers
  passing `fix: true` will now fail Zod validation.
- **Library public API**: `formatPrComment`, `formatRevalidateComment`,
  `formatHumanSummary`, `normalizeBranch`, `resolveReviewDir`, `tryReadFile`
  are no longer re-exported from `@ogham/filid`. They were moved into the
  internal `review-manage/format/` and `review-manage/utils/` organs as part
  of the FCA reclassification (Pre-ADR-1). External consumers that imported
  these helpers directly must migrate to `review_manage` MCP actions.

## Improvements

- **CheckpointPhase type**: added `'D'` state so `review_manage(checkpoint)`
  returns semantically correct phase when deliberation is pending (GAP-2).
- **Resume max-retry guard**: `review_manage(checkpoint)` now surfaces
  `resumeAttempts` and `resumeExhausted` fields; the `review` skill terminates
  with `INCONCLUSIVE` after 3 Phase A restarts (`MAX_RESUME_RETRIES = 3`),
  preventing infinite retry loops (LOGIC-011).
- **Agent delegation axis**: `fractal-architect` and `qa-reviewer` trigger
  descriptions rewritten to eliminate LCOM4/CC overlap — architect owns
  pre-implementation design; qa-reviewer owns post-implementation measurement
  (INT-017).
- **Skill-owned MCP orchestration**: `/filid:restructure` Stage 4 now
  explicitly invokes `structure_validate` from the skill and passes the
  report to `fractal-architect`, enforcing the capability boundary that
  agents do not call MCP tools directly (T4b).
- **Plugin manifest**: `.claude-plugin/plugin.json` now declares `agents`
  and `hooks` fields explicitly (GAP-4).
