import { samePath } from '@ogham/cross-platform/paths';

import { BUILTIN_RULE_IDS } from '../../../../constants/builtinRuleIds.js';
import type { RuleContext, RuleViolation } from '../../../../types/rules.js';

export function checkEntryPointSurface(context: RuleContext): RuleViolation[] {
  const { node } = context;
  if (node.type !== 'fractal' && node.type !== 'hybrid') return [];

  return node.entryPoints.flatMap((entryPoint) => {
    const evidence = node.entryPointSurfaces?.find((candidate) =>
      samePath(candidate.entryPoint.path, entryPoint.path),
    );
    if (entryPoint.surface === 'enumerated' && evidence?.certainty === 'exact')
      return [];
    const certainty =
      entryPoint.surface === 'unsupported'
        ? 'unsupported'
        : (evidence?.certainty ?? 'indeterminate');
    const state =
      entryPoint.surface === 'enumerated'
        ? certainty
        : `non-enumerable (${entryPoint.surface})`;
    return [
      {
        ruleId: BUILTIN_RULE_IDS.ENTRY_POINT_SURFACE,
        severity: 'warning' as const,
        message: `Public surface evidence is ${state} for "${entryPoint.path}".`,
        path: entryPoint.path,
        certainty,
      },
    ];
  });
}
