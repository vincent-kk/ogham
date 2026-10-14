import type {
  Rule,
  RuleContext,
  RuleViolation,
} from '../../../../types/rules.js';

import { matchExempt } from './matchExempt.js';

/**
 * Short-circuit the check when the node matches any exempt glob. `innerCheck`
 * may itself be a severity-remap wrapper from {@link remapSeverity} — that is
 * intended; exempt wraps whatever check the rule currently exposes, so the
 * outermost wrapper runs first and skips the inner pipeline on a match.
 * @param innerCheck Check to run when no exemption matches.
 * @param exempt Config exemption patterns.
 * @param ruleId Rule identity retained on exemption findings.
 * @returns A check that reports an info finding for exempt nodes.
 */
export function wrapExempt(
  innerCheck: Rule['check'],
  exempt: string[],
  ruleId: string,
): Rule['check'] {
  return (ctx: RuleContext): RuleViolation[] => {
    const pattern = matchExempt(ctx.node, exempt);
    if (pattern === null) return innerCheck(ctx);
    return [
      {
        ruleId,
        severity: 'info',
        message: `${ruleId} exempted by config (pattern ${pattern})`,
        path: ctx.node.path,
        suggestion:
          'Remove the pattern from rules.<id>.exempt to run the check.',
        exemptedBy: pattern,
      },
    ];
  };
}
