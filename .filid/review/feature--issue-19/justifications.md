# Justifications — feature/issue-19

**resolve_commit_sha**: 7e0f442da859cdacbdfe2b24aa296b605bd48def
**Date**: 2026-04-01
**Mode**: --auto (all accepted)

---

## FIX-1: Replace internal @maencof imports with entry point imports [ACCEPTED]

**Severity**: ERROR
**Rule**: FCA core — entry point imports
**Action**: Removed `tsconfig.json` paths block, replaced all `@maencof/*` internal imports with `@ogham/maencof` entry point imports across 7 source files.
**Files modified**: `tsconfig.json`, `src/tools/lens-search.ts`, `src/tools/lens-context.ts`, `src/tools/lens-navigate.ts`, `src/tools/lens-read.ts`, `src/tools/lens-status.ts`, `src/vault/graph-cache.ts`, `src/vault/stale-detector.ts`
**Verification**: typecheck passed

---

## FIX-2: Move PLAN.md out of fractal root [ACCEPTED]

**Severity**: WARNING
**Rule**: zero-peer-file
**Action**: Moved `packages/maencof-lens/PLAN.md` to `.metadata/maencof-lens/plan.md` via `git mv`.
**Verification**: file no longer in fractal root
