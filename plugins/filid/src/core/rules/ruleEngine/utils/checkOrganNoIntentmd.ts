import { BUILTIN_RULE_IDS } from '../../../../constants/builtinRuleIds.js';
import { KNOWN_ORGAN_DIR_NAMES } from '../../../../constants/organNames.js';
import type { RuleContext, RuleViolation } from '../../../../types/rules.js';

/**
 * Factory returning the organ-promotion check bound to the project's
 * `structure.additionalOrganNames`.
 *
 * `type === 'organ' && hasIntentMd` cannot occur in a real snapshot:
 * classification step 1 turns any directory holding INTENT.md into a fractal,
 * so that predicate never fires. The reachable shape is an organ-NAMED
 * directory that became a fractal on INTENT.md alone — a boundary nobody
 * necessarily decided to create. A DETAIL.md or an adapter-reported module
 * entry point means the promotion was deliberate, so the check stays silent.
 */
export function checkOrganNoIntentMd(
  additionalOrganNames?: string[],
): (context: RuleContext) => RuleViolation[] {
  return (context: RuleContext): RuleViolation[] => {
    const { node } = context;
    if (node.type !== 'fractal' || !node.hasIntentMd) return [];
    if (
      !KNOWN_ORGAN_DIR_NAMES.includes(node.name) &&
      !(additionalOrganNames ?? []).includes(node.name)
    )
      return [];
    if (node.hasDetailMd) return [];
    if (node.entryPoints.some((entryPoint) => entryPoint.kind === 'module'))
      return [];

    return [
      {
        ruleId: BUILTIN_RULE_IDS.ORGAN_NO_INTENTMD,
        severity: 'warning',
        message: `Organ-named directory "${node.name}" became a fractal through INTENT.md alone. Organ nodes do not own standalone documentation.`,
        path: node.path,
        suggestion:
          'Remove INTENT.md to keep it an organ, or complete the promotion with DETAIL.md and a module entry point.',
      },
    ];
  };
}
