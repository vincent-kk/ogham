import type {
  DispatchEvent,
  HookConcernResult,
  MergedHookOutput,
} from '../../../types/dispatch.js';

/**
 * Merge sequential concern results into one Claude Code hook envelope.
 *
 * - `continue`: AND — any `false` blocks; that result's `reason` is collected.
 * - `additionalContext`: non-empty values concatenated with `\n\n`, wrapped
 *   with `hookEventName = event` (context-capable events only populate it).
 * - `systemMessage` / `message`: non-empty values concatenated with `\n\n`
 *   (terminal-event channel — SessionEnd).
 *
 * Channels not used by an event simply stay absent (no concern populates them),
 * so one generic merge serves all five events. Block signalling (stdout JSON vs
 * stderr+exit(2)) is the entry's job, not the merge's.
 */
export function mergeHookOutput(
  event: DispatchEvent,
  results: HookConcernResult[],
): MergedHookOutput {
  let proceed = true;
  const reasons: string[] = [];
  const contexts: string[] = [];
  const systemMessages: string[] = [];
  const messages: string[] = [];

  for (const result of results) {
    if (result.continue === false) {
      proceed = false;
      if (result.reason) reasons.push(result.reason);
    }
    const context = result.hookSpecificOutput?.additionalContext;
    if (context) contexts.push(context);
    if (result.systemMessage) systemMessages.push(result.systemMessage);
    if (result.message) messages.push(result.message);
  }

  const merged: MergedHookOutput = { continue: proceed };
  if (reasons.length) merged.reason = reasons.join('\n\n');
  if (systemMessages.length) merged.systemMessage = systemMessages.join('\n\n');
  if (messages.length) merged.message = messages.join('\n\n');
  if (contexts.length)
    merged.hookSpecificOutput = {
      hookEventName: event,
      additionalContext: contexts.join('\n\n'),
    };

  return merged;
}
