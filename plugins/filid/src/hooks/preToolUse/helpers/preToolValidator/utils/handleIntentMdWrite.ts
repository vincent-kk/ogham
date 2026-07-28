import { DENY_RETRY_GUIDANCE } from '../../../../../constants/hookDefaults.js';
import { validateIntentMd } from '../../../../../core/rules/documentValidator/validators/validateIntentMd.js';
import type { HookOutput } from '../../../../../types/hooks.js';

export function handleIntentMdWrite(content: string): HookOutput {
  const result = validateIntentMd(content);
  if (!result.valid) {
    const errors = result.violations
      .filter((violation) => violation.severity === 'error')
      .map((violation) => violation.message)
      .join('; ');
    return {
      continue: true,
      hookSpecificOutput: {
        permissionDecision: 'deny',
        // Name only what failed. `validateIntentMd` raises `error` for the
        // line limit alone — the 3-tier check is a warning and never reaches
        // here — so the old blanket "add the 3-tier sections" instruction
        // named a cause this branch cannot have, and buried the real one.
        // Each violation message already states its own remedy.
        permissionDecisionReason: `INTENT.md write rejected: ${errors} ${DENY_RETRY_GUIDANCE}`,
      },
    };
  }

  const warnings = result.violations.filter(
    (violation) => violation.severity === 'warning',
  );
  if (warnings.length === 0) return { continue: true };
  return {
    continue: true,
    hookSpecificOutput: {
      additionalContext: warnings
        .map((violation) => violation.message)
        .join('; '),
    },
  };
}
