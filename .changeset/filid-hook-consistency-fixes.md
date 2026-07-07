---
"@ogham/filid": patch
---

Hook-layer consistency fixes from the 2026-07-07 behavior analysis:

- fractal-map visit keys are now `{boundary}\t{relDir}` composites — first-visit INTENT.md injection no longer collides across monorepo packages sharing a relative dir (e.g. two `src`).
- `writeFractalMap` union-merges under a bounded mkdir file lock with atomic tmp+rename — parallel Read batches no longer lose sibling visit records.
- `getParentSegments` resolves against cwd (out-of-project paths skip checks) — structure-guard stops warning from name fallbacks on absolute-path segments (the chronic `src/hooks` organ false positive) and its filesystem-based classification actually runs.
- SubagentStart role restrictions match plugin-namespaced spawns (`filid:qa-reviewer`).
- `fractal_navigate` classify falls back to the filesystem for INTENT.md/DETAIL.md when `entries` lacks the target, instead of silently misclassifying fractals as organs.
- Empty-content INTENT.md writes are validated (3-tier warning now surfaces) instead of bypassing validation.
- `[filid:guide]` map legend now states the real semantics (per-turn visits, `*` marks the just-accessed directory).
