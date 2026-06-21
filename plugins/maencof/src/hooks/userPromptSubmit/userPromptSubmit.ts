import { runLifecycleDispatcher } from '../lifecycleDispatcher/lifecycleDispatcher.js';
import type {
  DispatchInput,
  MergedHookOutput,
} from '../utils/dispatchTypes.js';
import { mergeHookOutput } from '../utils/mergeHookOutput.js';
import { safeConcern, safeConcernAsync } from '../utils/safeConcern.js';
import { runVaultCommitter } from '../vaultCommitter/vaultCommitter.js';

import { injectContext } from './helpers/contextInjector/contextInjector.js';
import { runInsightInjector } from './helpers/insightInjector/insightInjector.js';

/**
 * UserPromptSubmit: KG/turn context + lifecycle actions + insight banner, then
 * the opt-in vault auto-commit last (side-effect only, runs after context).
 */
export async function orchestrateUserPromptSubmit(
  input: DispatchInput,
): Promise<MergedHookOutput> {
  const results = [
    safeConcern(input.cwd, 'context-injector', () => injectContext(input)),
    safeConcern(input.cwd, 'lifecycle-dispatcher', () =>
      runLifecycleDispatcher('UserPromptSubmit', input),
    ),
    safeConcern(input.cwd, 'insight-injector', () => runInsightInjector(input)),
    await safeConcernAsync(input.cwd, 'vault-committer', () =>
      runVaultCommitter(input, 'UserPromptSubmit'),
    ),
  ];
  return mergeHookOutput('UserPromptSubmit', results);
}
