import { BUILTIN_RULE_IDS } from '../../../../constants/builtinRuleIds.js';
import type { RuleContext, RuleViolation } from '../../../../types/rules.js';

export function checkModuleEntryPoint(context: RuleContext): RuleViolation[] {
  const { node } = context;
  if (node.type !== 'fractal' && node.type !== 'hybrid') return [];
  if (node.entryPoints.length > 0) return [];
  return [
    {
      ruleId: BUILTIN_RULE_IDS.MODULE_ENTRY_POINT,
      severity: 'warning',
      message: `Fractal module "${node.name}" does not have an adapter-reported entry point.`,
      path: node.path,
      suggestion: 'Declare the module public boundary through its adapter.',
    },
  ];
}
