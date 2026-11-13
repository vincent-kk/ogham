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
 * @param granularity Project rules also match individual findings after node matching.
 * @returns A check that reports info findings without certainty for exemptions.
 */
export function wrapExempt(
  innerCheck: Rule['check'],
  exempt: string[],
  ruleId: string,
  granularity?: Rule['granularity'],
): Rule['check'] {
  return (ctx: RuleContext): RuleViolation[] => {
    const pattern = matchExempt(ctx.node, exempt);
    if (pattern === null) {
      const findings = innerCheck(ctx);
      if (granularity !== 'project') return findings;
      return findings.map((finding) => {
        const matched = matchExempt(finding, exempt);
        const paths = finding.memberPaths?.length ? finding.memberPaths : [finding.path];
        if (matched === null || !paths.every((path) => matchExempt({ path }, exempt) !== null)) return finding;
        return {
          ruleId,
          severity: 'info',
          message: `${ruleId} exempted by config (pattern ${matched})`,
          path: finding.path,
          suggestion: 'Remove the pattern from rules.<id>.exempt to run the check.',
          exemptedBy: matched,
        };
      });
    }
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
