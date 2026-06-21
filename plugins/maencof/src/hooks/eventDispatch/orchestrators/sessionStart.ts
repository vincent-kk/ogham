import { runLifecycleDispatcher } from '../../lifecycleDispatcher/index.js';
import { runSessionStart } from '../../sessionStart/index.js';
import { mergeHookOutput } from '../utils/mergeHookOutput.js';
import { safeConcern } from '../utils/safeConcern.js';
import type { DispatchInput, MergedHookOutput } from '../utils/types.js';

/**
 * SessionStart: vault init + dialogue meta-prompt, then user lifecycle actions.
 * The entry appends the selfProbe diagnostic to the merged additionalContext.
 */
export function orchestrateSessionStart(
  input: DispatchInput,
): MergedHookOutput {
  const results = [
    safeConcern(input.cwd, 'session-start', () => runSessionStart(input)),
    safeConcern(input.cwd, 'lifecycle-dispatcher', () =>
      runLifecycleDispatcher('SessionStart', input),
    ),
  ];
  return mergeHookOutput('SessionStart', results);
}
