import {
  type SectionMarkers,
  sectionMarkers,
} from '@ogham/cross-platform/instructions';

/** Namespace owning filid's spans of a host instruction file. */
export const FILID_SECTION_NAMESPACE = 'FILID';

/** The mandatory rule document — the one the hook reports the project's status from. */
export const FCA_POLICY_RULE_DOC = 'filid_fca-policy.md';

/** Its name before the `filid_` prefix rename. Still counts as deployed. */
export const LEGACY_FCA_POLICY_RULE_DOC = 'fca.md';

/**
 * Delimiters for one rule document inside a merged instruction file.
 *
 * Keyed by filename because a host that reads a single file (Codex reads `AGENTS.md`
 * and no directory) has to hold the whole `.claude/rules` directory in it, and each
 * document still has to be updatable and removable on its own.
 *
 * Shared by the writer (`syncRuleDocsToFile`) and the hook that reports whether rules
 * are deployed — a marker mismatch between those two would make the hook declare
 * "rules not deployed" over a file it had just written.
 */
export function ruleDocMarkers(filename: string): SectionMarkers {
  return sectionMarkers(FILID_SECTION_NAMESPACE, filename);
}
