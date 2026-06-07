import type {
  Rule,
  RuleContext,
  RuleSeverity,
  RuleViolation,
} from '../../../../types/rules.js';

/**
 * Remap every violation's severity to `severity`. `innerCheck` is whatever
 * check function is currently on the rule — may itself be a wrapper.
 */
export function remapSeverity(
  innerCheck: Rule['check'],
  severity: RuleSeverity,
): Rule['check'] {
  return (ctx: RuleContext): RuleViolation[] =>
    innerCheck(ctx).map((v) => ({ ...v, severity }));
}
