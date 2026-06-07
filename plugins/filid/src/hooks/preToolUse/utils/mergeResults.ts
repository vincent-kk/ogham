import { GENERIC_DENY_REASON } from '../../../constants/hookDefaults.js';
import type { HookOutput } from '../../../types/hooks.js';

/**
 * Merge multiple HookOutput results:
 * - continue: AND (defensive — a violation deny no longer produces `false`,
 *   but a future hook could).
 * - permissionDecision: any `'deny'` input wins; otherwise omitted.
 * - permissionDecisionReason: deny reasons concatenated with \n\n; a generic
 *   fallback is used if denied without any reason (never a bare deny).
 * - additionalContext: concatenated with \n\n, independent of the deny path.
 */
export function mergeResults(results: HookOutput[]): HookOutput {
  let combinedContinue = true;
  let denied = false;
  const reasons: string[] = [];
  const contexts: string[] = [];

  // Concat order = caller push order (preToolUse.ts L40-41:
  // validatePreToolUse before guardStructure).
  for (const result of results) {
    if (result.continue === false) combinedContinue = false;
    const hookSpecificOutput = result.hookSpecificOutput;
    if (hookSpecificOutput?.permissionDecision === 'deny') {
      denied = true;
      if (hookSpecificOutput.permissionDecisionReason)
        reasons.push(hookSpecificOutput.permissionDecisionReason);
    }
    if (hookSpecificOutput?.additionalContext)
      contexts.push(hookSpecificOutput.additionalContext);
  }

  const hookSpecificOutput: HookOutput['hookSpecificOutput'] = {};
  if (denied) {
    hookSpecificOutput.permissionDecision = 'deny';
    // Fallback: a deny must always carry a reason.
    hookSpecificOutput.permissionDecisionReason = reasons.length
      ? reasons.join('\n\n')
      : GENERIC_DENY_REASON;
  }
  if (contexts.length)
    hookSpecificOutput.additionalContext = contexts.join('\n\n');

  if (Object.keys(hookSpecificOutput).length === 0)
    return { continue: combinedContinue };

  return {
    continue: combinedContinue,
    hookSpecificOutput: { hookEventName: 'PreToolUse', ...hookSpecificOutput },
  };
}
