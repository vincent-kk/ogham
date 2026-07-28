import { DENY_RETRY_GUIDANCE } from '../../../../../constants/hookDefaults.js';
import { validateDetailMd } from '../../../../../core/rules/documentValidator/validators/validateDetailMd.js';
import type { HookOutput } from '../../../../../types/hooks.js';

export function handleDetailMdWrite(
  content: string,
  oldContent: string,
): HookOutput {
  const result = validateDetailMd(content, oldContent);
  if (result.valid) return { continue: true };

  const errors = result.violations
    .filter((violation) => violation.severity === 'error')
    .map((violation) => violation.message)
    .join('; ');
  return {
    continue: true,
    hookSpecificOutput: {
      permissionDecision: 'deny',
      permissionDecisionReason:
        `DETAIL.md write rejected: ${errors}. Rewrite it to the current ` +
        `state — keep only the live API contract and acceptance criteria, ` +
        `drop superseded history, never append. ${DENY_RETRY_GUIDANCE}`,
    },
  };
}
