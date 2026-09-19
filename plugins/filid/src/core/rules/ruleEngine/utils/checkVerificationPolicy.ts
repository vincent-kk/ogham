import type {
  Rule,
  RuleContext,
  RuleViolation,
} from '../../../../types/rules.js';
import type { VerificationRuleId } from '../../../../types/verification.js';

export function checkVerificationPolicy(
  ruleId: VerificationRuleId,
): Rule['check'] {
  return (context: RuleContext): RuleViolation[] => {
    const verification = context.snapshot?.verification;
    if (!verification)
      return [
        {
          ruleId,
          severity: 'warning',
          message:
            'Verification policy evaluation requires a project snapshot.',
          path: context.tree.root,
          certainty: 'indeterminate',
          suggestion:
            'Evaluate through fractal_inspect action "validate" or "verification", which build the verification evidence this rule needs.',
        },
      ];
    const findings = verification.violations.filter(
      (violation) => violation.ruleId === ruleId,
    );
    if (findings.length > 0) return findings;
    if (verification.certainty === 'exact') return [];
    return [
      {
        ruleId,
        severity: 'warning',
        message: `Verification evidence is ${verification.certainty}, so the ${ruleId} policy cannot be proven.`,
        path: context.snapshot!.projectRoot,
        certainty: verification.certainty,
        suggestion:
          'Call fractal_inspect action "verification" to see which files are not exact; each count reason names the line filid could not count.',
      },
    ];
  };
}
