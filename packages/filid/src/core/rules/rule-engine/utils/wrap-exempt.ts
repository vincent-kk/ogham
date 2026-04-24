import type { Rule, RuleContext, RuleViolation } from '../../../../types/rules.js';
import { isExempt } from './is-exempt.js';

/**
 * Short-circuit the check when the node matches any exempt glob. `innerCheck`
 * may itself be a severity-remap wrapper from {@link remapSeverity} — that is
 * intended; exempt wraps whatever check the rule currently exposes, so the
 * outermost wrapper runs first and skips the inner pipeline on a match.
 */
export function wrapExempt(
  innerCheck: Rule['check'],
  exempt: string[],
): Rule['check'] {
  return (ctx: RuleContext): RuleViolation[] =>
    isExempt(ctx.node, exempt) ? [] : innerCheck(ctx);
}
