import { injectContext } from '../../contextInjector/index.js';
import { runInsightInjector } from '../../insightInjector/index.js';
import { runLifecycleDispatcher } from '../../lifecycleDispatcher/index.js';
import { runVaultCommitter } from '../../vaultCommitter/index.js';
import { mergeHookOutput } from '../utils/mergeHookOutput.js';
import { safeConcern, safeConcernAsync } from '../utils/safeConcern.js';
import type { DispatchInput, MergedHookOutput } from '../utils/types.js';

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
