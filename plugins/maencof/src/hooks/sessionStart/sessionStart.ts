import type { DispatchInput, MergedHookOutput } from '../../types/dispatch.js';
import { runLifecycleDispatcher } from '../utils/lifecycleDispatcher/lifecycleDispatcher.js';
import { mergeHookOutput } from '../utils/mergeHookOutput/mergeHookOutput.js';
import { safeConcern } from '../utils/safeConcern/safeConcern.js';

import { runSessionStart } from './helpers/bootstrap/bootstrap.js';
import { runRemindExpiredBuffer } from './helpers/remindExpiredBuffer/remindExpiredBuffer.js';

/**
 * SessionStart: vault init + dialogue meta-prompt, then user lifecycle actions.
 * The entry appends the selfProbe diagnostic to the merged additionalContext.
 */
export function orchestrateSessionStart(
  input: DispatchInput,
): MergedHookOutput {
  const results = [
    safeConcern(input.cwd, 'session-start', () => runSessionStart(input)),
    safeConcern(input.cwd, 'remind-expired-buffer', () =>
      runRemindExpiredBuffer(input.cwd ?? process.cwd()),
    ),
    safeConcern(input.cwd, 'lifecycle-dispatcher', () =>
      runLifecycleDispatcher('SessionStart', input),
    ),
  ];
  return mergeHookOutput('SessionStart', results);
}
