import { samePath } from '@ogham/cross-platform';

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
    const suggestion =
      entryPoint.surface === 'enumerated'
        ? 'Filid could not list every export of this entry point (see the diagnostics for its path). Write its public surface as named exports or named re-exports so every name is explicit, then run again.'
        : entryPoint.surface === 'unsupported'
          ? 'No active adapter reads this entry point, so its surface stays unsupported. Enable an adapter for its language through adapters in .filid/config.json, or accept the warning.'
          : "The entry point's surface is a convention filid cannot enumerate, such as a wildcard or framework export. Replace the wildcard with named re-exports, or accept the warning when a framework owns the surface.";
    return [
      {
        ruleId: BUILTIN_RULE_IDS.ENTRY_POINT_SURFACE,
        severity: 'warning' as const,
        message: `Public surface evidence is ${state} for "${entryPoint.path}".`,
        path: entryPoint.path,
        certainty,
        suggestion,
      },
    ];
  });
}
