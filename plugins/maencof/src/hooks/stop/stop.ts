import type {
  DispatchInput,
  HookConcernResult,
  MergedHookOutput,
} from '../../types/dispatch.js';
import { runLifecycleDispatcher } from '../utils/lifecycleDispatcher/lifecycleDispatcher.js';
import { mergeHookOutput } from '../utils/mergeHookOutput/mergeHookOutput.js';
import {
  safeConcern,
  safeConcernAsync,
} from '../utils/safeConcern/safeConcern.js';

import { runChangelogGate } from './helpers/changelogGate/changelogGate.js';
import { runSessionRecap } from './helpers/sessionRecap/sessionRecap.js';

/**
 * Stop: the changelog gate runs first — it may block (continue:false) and is
 * the sole venue that cleans up orphan migration.lock files, so it must always
 * run. The entry turns a block into stderr + exit(2). The session recap runs
 * only when the gate passed — on a block the entry drops stdout JSON, which
 * would waste the recap's once-per-session marker.
 */
export async function orchestrateStop(
  input: DispatchInput,
): Promise<MergedHookOutput> {
  const gate = await safeConcernAsync(input.cwd, 'changelog-gate', () =>
    runChangelogGate(input),
  );

  const results: HookConcernResult[] = [gate];
  if (gate.continue !== false)
    results.push(
      safeConcern(input.cwd, 'session-recap', () => runSessionRecap(input)),
    );

  results.push(
    safeConcern(input.cwd, 'lifecycle-dispatcher', () =>
      runLifecycleDispatcher('Stop', input),
    ),
  );
  return mergeHookOutput('Stop', results);
}
