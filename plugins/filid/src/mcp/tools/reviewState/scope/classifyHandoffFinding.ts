import { BUILTIN_RULE_IDS } from '../../../../constants/builtinRuleIds.js';
import {
  REVIEW_HANDOFF_RULE_CLASSES,
  type ReviewHandoffClass,
} from '../../../../constants/reviewState.js';
import { RULE_SCOPES } from '../../../../constants/ruleScopes.js';
import type { RuleScope } from '../../../../types/rules.js';
import type { ReviewScopeViolation } from '../state/reviewStateTypes.js';

/**
 * Classify one retained FCA violation for the PR handoff table and seed.
 * @param violation Changed-scope finding whose certainty takes precedence.
 * @param ruleScope Declared rule scope, or undefined for an unknown rule.
 * @param generatedPaths Configured generated-path tokens used by stale-path findings.
 * @returns Stable handoff class and any note prefix required for unknown evidence.
 */
export function classifyHandoffFinding(
  violation: ReviewScopeViolation,
  ruleScope: RuleScope | undefined,
  generatedPaths: readonly string[],
): { class: ReviewHandoffClass; notePrefix: string } {
  if (
    violation.certainty === 'indeterminate' ||
    violation.certainty === 'unsupported'
  )
    return { class: 'indeterminate', notePrefix: '' };
  if (
    violation.certainty === undefined &&
    violation.message.includes('indeterminate')
  )
    return { class: 'indeterminate', notePrefix: '' };
  if (violation.ruleId === 'stale-path')
    return {
      class: generatedPaths.some((path) => violation.message.includes(path))
        ? 'config-decision'
        : 'needs-rework',
      notePrefix: '',
    };
  if (
    violation.ruleId === 'missing-field' &&
    violation.message.includes('Boundary Exemption') &&
    violation.message.includes('Reason')
  )
    return { class: 'config-decision', notePrefix: '' };
  const mappedClass = REVIEW_HANDOFF_RULE_CLASSES[violation.ruleId];
  if (mappedClass) return { class: mappedClass, notePrefix: '' };
  if (
    violation.certainty === 'exact' &&
    (violation.ruleId === BUILTIN_RULE_IDS.TEST_RECORD_CASE_CAP ||
      violation.ruleId.startsWith('spec-'))
  )
    return { class: 'code-change', notePrefix: '' };
  if (ruleScope === RULE_SCOPES.DOCUMENTS)
    return { class: 'needs-rework', notePrefix: '' };
  if (ruleScope === RULE_SCOPES.VERIFICATION)
    return { class: 'code-change', notePrefix: '' };
  return { class: 'code-change', notePrefix: 'unclassified: ' };
}
