import { REVIEW_STATE_DIAGNOSTIC_CODES } from '../../../../constants/reviewState.js';
import { ToolDiagnosticError } from '../../../errors/toolDiagnosticError.js';

import { matchesReviewGlob as matchesGlob } from './matchesReviewGlob.js';
import type {
  ResolveFileRulesInput,
  ReviewRuleDefinition,
} from './reviewRuleTypes.js';

/**
 * Test whether a rule's single selector applies to a changed path.
 * @param rule Validated rule declaration.
 * @param input Changed-file selection input.
 * @returns True when the rule applies.
 */
function applies(
  rule: ReviewRuleDefinition,
  input: ResolveFileRulesInput,
): boolean {
  const { file } = input;
  const path = file.path;
  if (rule.always === true) return true;
  const matchesPath = rule.match?.some((glob) => matchesGlob(glob, path));
  if (matchesPath) return true;
  if (rule.when === 'owner') return file.owner !== null;
  if (rule.when === 'role:verification') return file.role === 'verification';
  return rule.when === 'role:document' && file.role === 'document';
}

/**
 * Select built-in and repository rule identifiers in declaration order.
 * @param input Changed-file facts and validated rule declarations.
 * @returns Active identifiers with explicitly replaced built-ins removed.
 */
export function resolveFileRules(input: ResolveFileRulesInput): string[] {
  const replaced = new Set(
    input.overrides.flatMap((rule) => rule.replaces ?? []),
  );
  const activeIds = new Set<string>();
  const active: ReviewRuleDefinition[] = [];
  for (const rule of input.rules) {
    if (replaced.has(rule.id)) continue;
    if (activeIds.has(rule.id))
      throw new Error(`Review rules duplicate active id "${rule.id}".`);
    active.push(rule);
    activeIds.add(rule.id);
  }
  for (const override of input.overrides) {
    if (activeIds.has(override.id))
      throw new ToolDiagnosticError(
        REVIEW_STATE_DIAGNOSTIC_CODES.REPOSITORY_RULES_INVALID,
        `Repository review rule "${override.id}" reuses the id of an active built-in rule.`,
        `Ask the user to rename rule "${override.id}" in .filid/review-rules.json, or list the built-in id in its "replaces" array. Then call review_state prepare again.`,
      );
    active.push(override);
    activeIds.add(override.id);
  }
  const selected = active
    .filter((rule) => applies(rule, input))
    .map((rule) => rule.id);
  return [...new Set(selected)];
}
