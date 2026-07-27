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
        message: `Verification evidence is ${verification.certainty}.`,
        path: context.snapshot!.projectRoot,
        certainty: verification.certainty,
      },
    ];
  };
}
