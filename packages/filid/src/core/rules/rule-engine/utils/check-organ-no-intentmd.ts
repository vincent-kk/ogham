import { BUILTIN_RULE_IDS } from '../../../../constants/builtin-rule-ids.js';
import type { RuleContext, RuleViolation } from '../../../../types/rules.js';

export function checkOrganNoIntentMd(context: RuleContext): RuleViolation[] {
  const { node } = context;
  if (node.type === 'organ' && node.hasIntentMd) {
    return [
      {
        ruleId: BUILTIN_RULE_IDS.ORGAN_NO_INTENTMD,
        severity: 'error',
        message: `Organ directory "${node.name}" contains INTENT.md. Organ nodes must not have standalone documentation.`,
        path: node.path,
        suggestion:
          'Remove INTENT.md or reclassify this directory as a fractal node.',
      },
    ];
  }
  return [];
}
