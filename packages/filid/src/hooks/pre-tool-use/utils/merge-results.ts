import type { HookOutput } from '../../../types/hooks.js';

/**
 * Merge multiple HookOutput results:
 * - continue: AND (all must be true)
 * - additionalContext: concatenate non-empty with \n\n
 * - On block (continue=false): use first blocker's output
 */
export function mergeResults(results: HookOutput[]): HookOutput {
  let combinedContinue = true;
  const contexts: string[] = [];
  let blockOutput: HookOutput['hookSpecificOutput'] | undefined;

  for (const r of results) {
    if (r.continue === false) {
      combinedContinue = false;
      if (!blockOutput && r.hookSpecificOutput) {
        blockOutput = r.hookSpecificOutput;
      }
    }
    const ctx = r.hookSpecificOutput?.additionalContext;
    if (ctx) {
      contexts.push(ctx);
    }
  }

  if (!combinedContinue) {
    return {
      continue: false,
      hookSpecificOutput: blockOutput
        ? { ...blockOutput, hookEventName: 'PreToolUse' }
        : {
            hookEventName: 'PreToolUse',
            additionalContext: contexts.join('\n\n'),
          },
    };
  }

  if (contexts.length > 0) {
    return {
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        additionalContext: contexts.join('\n\n'),
      },
    };
  }

  return { continue: true };
}
