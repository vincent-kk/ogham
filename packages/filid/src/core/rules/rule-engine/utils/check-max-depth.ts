import { BUILTIN_RULE_IDS } from '../../../../constants/builtin-rule-ids.js';
import { DEFAULT_SCAN_OPTIONS } from '../../../../constants/scan-defaults.js';
import type { RuleContext, RuleViolation } from '../../../../types/rules.js';

export function checkMaxDepth(context: RuleContext): RuleViolation[] {
  const { node, scanOptions } = context;
  const maxDepth = scanOptions?.maxDepth ?? DEFAULT_SCAN_OPTIONS.maxDepth;
  if (node.depth > maxDepth) {
    return [
      {
        ruleId: BUILTIN_RULE_IDS.MAX_DEPTH,
        severity: 'error',
        message: `The depth of "${node.name}" (${node.depth}) exceeds the maximum allowed depth (${maxDepth}).`,
        path: node.path,
        suggestion:
          'Flatten the directory structure or merge related modules.',
      },
    ];
  }
  return [];
}
