import type { HookOutput } from '../../types/hooks.js';

/**
 * Write only hook results that carry meaningful injected context.
 *
 * @param output Processor result to expose on the hook wire.
 * @returns Nothing; no-op results deliberately leave stdout untouched.
 */
export function writeHookOutput(output: HookOutput): void {
  const context = output.hookSpecificOutput?.additionalContext;
  if (context === undefined || context.trim() === '') return;
  process.stdout.write(JSON.stringify(output));
}
