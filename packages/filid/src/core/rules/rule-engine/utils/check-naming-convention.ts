import { BUILTIN_RULE_IDS } from '../../../../constants/builtin-rule-ids.js';
import type { RuleContext, RuleViolation } from '../../../../types/rules.js';
import { isValidNaming } from './is-valid-naming.js';

export function checkNamingConvention(context: RuleContext): RuleViolation[] {
  const { node } = context;
  if (!isValidNaming(node.name)) {
    return [
      {
        ruleId: BUILTIN_RULE_IDS.NAMING_CONVENTION,
        severity: 'warning',
        message: `Directory name "${node.name}" does not follow kebab-case or camelCase conventions.`,
        path: node.path,
        suggestion: `Rename "${node.name}" to kebab-case (e.g. my-module) or camelCase (e.g. myModule).`,
      },
    ];
  }
  return [];
}
