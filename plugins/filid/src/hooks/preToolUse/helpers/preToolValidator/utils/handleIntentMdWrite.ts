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
        // Each validateIntentMd error (line cap or History section) states its
        // own remedy. The 3-tier check is a warning and never reaches this deny.
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
