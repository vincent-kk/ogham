import type {
  DispatchInput,
  HookConcernResult,
  MergedHookOutput,
} from '../../types/dispatch.js';
import { runLifecycleDispatcher } from '../utils/lifecycleDispatcher/lifecycleDispatcher.js';
import { mergeHookOutput } from '../utils/mergeHookOutput/mergeHookOutput.js';
import { safeConcern } from '../utils/safeConcern/safeConcern.js';

import { runLayerGuard } from './helpers/layerGuard/layerGuard.js';
import { runVaultRedirector } from './helpers/vaultRedirector/operations/runVaultRedirector.js';

/**
 * PreToolUse: the consolidated matcher is `*`, so route by tool_name —
 * Write|Edit to the Layer-1 guard (may block), Read|Grep|Glob to the vault
 * redirector advisory. Lifecycle actions always run.
 */
export function orchestratePreToolUse(input: DispatchInput): MergedHookOutput {
  const results: HookConcernResult[] = [];
  const tool = input.tool_name;

  if (tool === 'Write' || tool === 'Edit')
    results.push(
      safeConcern(input.cwd, 'layer-guard', () => runLayerGuard(input)),
    );

  if (tool === 'Read' || tool === 'Grep' || tool === 'Glob')
    results.push(
      safeConcern(input.cwd, 'vault-redirector', () =>
        runVaultRedirector(input),
      ),
    );

  results.push(
    safeConcern(input.cwd, 'lifecycle-dispatcher', () =>
      runLifecycleDispatcher('PreToolUse', input),
    ),
  );
  return mergeHookOutput('PreToolUse', results);
}
