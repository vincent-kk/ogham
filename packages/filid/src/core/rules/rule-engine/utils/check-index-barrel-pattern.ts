import { BUILTIN_RULE_IDS } from '../../../../constants/builtin-rule-ids.js';
import type { RuleContext, RuleViolation } from '../../../../types/rules.js';

export function checkIndexBarrelPattern(context: RuleContext): RuleViolation[] {
  const { node } = context;
  // fractal/hybrid 노드에만 적용, index가 있어야 함
  if (node.type !== 'fractal' && node.type !== 'hybrid') return [];
  if (!node.hasIndex) return [];

  // metadata에 barrelPattern이 있으면 활용
  const barrelPattern = node.metadata['barrelPattern'] as
    | { isPureBarrel: boolean; declarationCount: number }
    | undefined;

  if (
    barrelPattern &&
    !barrelPattern.isPureBarrel &&
    barrelPattern.declarationCount > 0
  ) {
    return [
      {
        ruleId: BUILTIN_RULE_IDS.INDEX_BARREL_PATTERN,
        severity: 'warning',
        message: `"${node.name}/index.ts" contains ${barrelPattern.declarationCount} direct declarations and does not follow the pure barrel pattern.`,
        path: node.path,
        suggestion:
          'Move direct declarations into separate files and re-export them from index.ts.',
      },
    ];
  }
  return [];
}
