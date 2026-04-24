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
        message: `Name "${node.name}" does not follow an accepted naming convention (camelCase, kebab-case, or PascalCase).`,
        path: node.path,
        suggestion: `Rename "${node.name}" to camelCase (default, e.g. myModule), or use kebab-case / PascalCase when the sibling structure or domain convention calls for it.`,
      },
    ];
  }
  return [];
}
