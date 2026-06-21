import { runLifecycleDispatcher } from '../lifecycleDispatcher/lifecycleDispatcher.js';
import type {
  DispatchInput,
  MergedHookOutput,
} from '../utils/dispatchTypes.js';
import { mergeHookOutput } from '../utils/mergeHookOutput.js';
import { safeConcern, safeConcernAsync } from '../utils/safeConcern.js';
import { runVaultCommitter } from '../vaultCommitter/vaultCommitter.js';

import { runSessionEnd } from './helpers/finalize/finalize.js';

/**
 * SessionEnd: finalize the session record + daily digest first, then lifecycle
 * actions, then the opt-in vault commit last so the freshly written session and
 * digest files are included in that commit.
 */
export async function orchestrateSessionEnd(
  input: DispatchInput,
): Promise<MergedHookOutput> {
  const results = [
    safeConcern(input.cwd, 'session-end', () => runSessionEnd(input)),
    safeConcern(input.cwd, 'lifecycle-dispatcher', () =>
      runLifecycleDispatcher('SessionEnd', input),
    ),
    await safeConcernAsync(input.cwd, 'vault-committer', () =>
      runVaultCommitter(input, 'SessionEnd'),
    ),
  ];
  return mergeHookOutput('SessionEnd', results);
}
