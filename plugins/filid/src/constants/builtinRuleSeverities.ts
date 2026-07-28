/**
 * @file builtinRuleSeverities.ts
 * @description The severity a builtin rule carries before any project override.
 *
 * The rule roster and the default config both need this value. While each held
 * its own copy they drifted three ways at once, and the drift was invisible to
 * a project that hand-writes a partial `rules` block — overrides only touch the
 * rules they name, so the roster answered there and the default config answered
 * everywhere else. One table, read by both, removes the question.
 */
import type { BuiltinRuleId } from './builtinRuleIds.js';

export const BUILTIN_RULE_SEVERITIES = {
  'intent-document-contract': 'error',
  'detail-document-contract': 'error',
  'organ-no-intentmd': 'warning',
  'entry-point-surface': 'warning',
  'module-entry-point': 'warning',
  'max-depth': 'error',
  'circular-dependency': 'error',
  'pure-function-isolation': 'error',
  'zero-peer-file': 'warning',
  'external-import-boundary': 'error',
  'spec-document-case-cap': 'error',
  'test-record-case-cap': 'error',
  'spec-fragmentation': 'error',
  'spec-contract-link': 'warning',
  'legacy-criteria-ledger': 'warning',
} as const satisfies Record<BuiltinRuleId, 'error' | 'warning'>;
