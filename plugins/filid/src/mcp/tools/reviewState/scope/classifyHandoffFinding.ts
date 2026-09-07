import {
  REVIEW_HANDOFF_RULE_CLASSES,
  type ReviewHandoffClass,
} from '../../../../constants/reviewState.js';
import { RULE_SCOPES } from '../../../../constants/ruleScopes.js';
import type { RuleScope } from '../../../../types/rules.js';
import { matchesGeneratedPath } from '../assess/matchesGeneratedPath.js';
import type { ReviewScopeViolation } from '../state/reviewStateTypes.js';

/** Path token delimited by the canonical stale-document finding message. */
const STALE_PATH_TOKEN_PATTERN = /^Path token `([^`\r\n]+)` /u;

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
  if (violation.ruleId === 'stale-path') {
    const stalePathToken = STALE_PATH_TOKEN_PATTERN.exec(
      violation.message,
    )?.[1];
    return {
      class:
        stalePathToken !== undefined &&
        generatedPaths.some((path) =>
          matchesGeneratedPath(path, stalePathToken),
        )
          ? 'config-decision'
          : 'needs-rework',
      notePrefix: '',
    };
  }
  const normalizedMessage = violation.message.toLowerCase();
  if (
    violation.ruleId === 'missing-field' &&
    normalizedMessage.includes('boundary exemption') &&
    normalizedMessage.includes('reason')
  )
    return { class: 'config-decision', notePrefix: '' };
  const mappedClass = REVIEW_HANDOFF_RULE_CLASSES[violation.ruleId];
  if (mappedClass) return { class: mappedClass, notePrefix: '' };
  if (ruleScope === RULE_SCOPES.DOCUMENTS)
    return { class: 'needs-rework', notePrefix: '' };
  if (ruleScope === RULE_SCOPES.VERIFICATION)
    return { class: 'code-change', notePrefix: '' };
  return { class: 'code-change', notePrefix: 'unclassified: ' };
}
