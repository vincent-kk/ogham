import { runLifecycleDispatcher } from '../lifecycleDispatcher/lifecycleDispatcher.js';
import type {
  DispatchInput,
  HookConcernResult,
  MergedHookOutput,
} from '../utils/dispatchTypes.js';
import { mergeHookOutput } from '../utils/mergeHookOutput.js';
import { safeConcern } from '../utils/safeConcern.js';

import { runLayerGuard } from './helpers/layerGuard/layerGuard.js';
import { runVaultRedirector } from './helpers/vaultRedirector/vaultRedirector.js';

/**
 * PreToolUse: the consolidated matcher is `*`, so route by tool_name —
 * Write|Edit to the Layer-1 guard (may block), Read|Grep|Glob to the vault
 * redirector advisory. Lifecycle actions always run.
 */
export function orchestratePreToolUse(input: DispatchInput): MergedHookOutput {
  const results: HookConcernResult[] = [];
  const tool = input.tool_name;

  if (tool === 'Write' || tool === 'Edit') {
    results.push(
      safeConcern(input.cwd, 'layer-guard', () => runLayerGuard(input)),
    );
  }
  if (tool === 'Read' || tool === 'Grep' || tool === 'Glob') {
    results.push(
      safeConcern(input.cwd, 'vault-redirector', () =>
        runVaultRedirector(input),
      ),
    );
  }
  results.push(
    safeConcern(input.cwd, 'lifecycle-dispatcher', () =>
      runLifecycleDispatcher('PreToolUse', input),
    ),
  );
  return mergeHookOutput('PreToolUse', results);
}
