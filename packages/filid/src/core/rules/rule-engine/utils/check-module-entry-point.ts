import { BUILTIN_RULE_IDS } from '../../../../constants/builtin-rule-ids.js';
import type { RuleContext, RuleViolation } from '../../../../types/rules.js';

export function checkModuleEntryPoint(context: RuleContext): RuleViolation[] {
  const { node } = context;
  if (node.type !== 'fractal' && node.type !== 'hybrid') return [];
  if (!node.hasIndex && !node.hasMain) {
    return [
      {
        ruleId: BUILTIN_RULE_IDS.MODULE_ENTRY_POINT,
        severity: 'warning',
        message: `Fractal module "${node.name}" does not have an entry point (index.ts or main.ts).`,
        path: node.path,
        suggestion:
          'Create index.ts or main.ts and define the public API of the module there.',
      },
    ];
  }
  return [];
}
