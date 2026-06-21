import { runLifecycleDispatcher } from '../utils/lifecycleDispatcher/lifecycleDispatcher.js';
import type {
  DispatchInput,
  MergedHookOutput,
} from '../../types/dispatch.js';
import { mergeHookOutput } from '../utils/mergeHookOutput/mergeHookOutput.js';
import { safeConcern, safeConcernAsync } from '../utils/safeConcern/safeConcern.js';

import { runChangelogGate } from './helpers/changelogGate/changelogGate.js';

/**
 * Stop: the changelog gate runs first — it may block (continue:false) and is
 * the sole venue that cleans up orphan migration.lock files, so it must always
 * run. The entry turns a block into stderr + exit(2).
 */
export async function orchestrateStop(
  input: DispatchInput,
): Promise<MergedHookOutput> {
  const results = [
    await safeConcernAsync(input.cwd, 'changelog-gate', () =>
      runChangelogGate(input),
    ),
    safeConcern(input.cwd, 'lifecycle-dispatcher', () =>
      runLifecycleDispatcher('Stop', input),
    ),
  ];
  return mergeHookOutput('Stop', results);
}
