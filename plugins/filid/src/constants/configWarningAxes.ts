/**
 * Config paths whose dropped value leaves the analysis the same or stricter,
 * so a warning about one affects no analysis axis. `*` matches any single
 * segment, and a pattern also covers every path beneath it. Every other dropped
 * entry — any other invalid value, any unknown key, a whole-config fallback —
 * affects every axis, because the owner may have meant it to tighten the
 * analysis.
 *
 * Why each is loosen-only: every builtin rule is enabled by default and no
 * builtin severity is `info`, so dropping `enabled` or `severity` checks the
 * same or more; dropping `exempt`, `additionalAllowedPeers` or
 * `generatedPaths` exempts, allows or excuses less.
 */
export const LOOSEN_ONLY_CONFIG_PATHS: readonly (readonly string[])[] = [
  ['rules', '*', 'exempt'],
  ['rules', '*', 'enabled'],
  ['rules', '*', 'severity'],
  ['structure', 'additionalAllowedPeers'],
  ['structure', 'generatedPaths'],
];
