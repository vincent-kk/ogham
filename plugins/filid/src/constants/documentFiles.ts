/**
 * Canonical FCA document filenames — the single source of truth.
 *
 * Every `existsSync` / `path.join` / basename comparison against these names
 * MUST import from here rather than inlining the literal, so the file-naming
 * contract lives in exactly one place. See issue #90 (INTENT.md -> AGENTS.md,
 * deferred): that migration is a one-line change here plus a `git mv` only for
 * as long as no literal escapes this module.
 */
export const INTENT_MD = 'INTENT.md';
export const DETAIL_MD = 'DETAIL.md';
