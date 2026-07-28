import {
  type SectionMarkers,
  sectionMarkers,
} from '@ogham/cross-platform/instructions/read';

/** Namespace owning filid's spans of a host instruction file. */
export const FILID_SECTION_NAMESPACE = 'FILID';

/**
 * The rule document the hook reports the project's status from.
 *
 * All four rule documents are required and deploy in one sync, so the presence of
 * this one implies the rest. Its body names the siblings, which is why the hook
 * still points at a single address.
 */
export const PRIMARY_RULE_DOC = 'filid_fractal-boundaries.md';

/**
 * Addresses this document has had before. `filid_fca-policy.md` was the single
 * combined policy document that the four current rules replaced; an install that
 * still carries it is mid-upgrade, and the owned-orphan sweep retires it on the
 * next sync. The pre-prefix `fca.md` is no longer carried — that rename is long
 * past, and listing an address `syncRuleDocs` will not touch would let the hook
 * report rules as active when they are neither current nor maintained.
 *
 * The siblings deployed alongside the primary document carry no legacy chain —
 * they never existed under another name.
 */
export const LEGACY_RULE_DOCS = ['filid_fca-policy.md'] as const;

/**
 * Delimiters for one rule document inside a merged instruction file.
 *
 * Keyed by filename because a host that reads a single file (Codex reads `AGENTS.md`
 * and no directory) has to hold the whole `.claude/rules` directory in it, and each
 * document still has to be updatable and removable on its own.
 *
 * Kept as a compatibility helper for callers and tests. The shared rule manager uses
 * the same owner namespace and filename key when it writes or inspects these spans.
 */
export function ruleDocMarkers(filename: string): SectionMarkers {
  return sectionMarkers(FILID_SECTION_NAMESPACE, filename);
}
