import type { NormalizeCodexToolUsesResult } from '@ogham/cross-platform';

import type {
  DispatchInput,
  HookConcernResult,
  MergedHookOutput,
} from '../../types/dispatch.js';
import { isInsideMaencofVault } from '../shared/isMaencofVault.js';
import { runLifecycleDispatcher } from '../utils/lifecycleDispatcher/lifecycleDispatcher.js';
import { mergeHookOutput } from '../utils/mergeHookOutput/mergeHookOutput.js';
import { safeConcern } from '../utils/safeConcern/safeConcern.js';

import { runLayerGuard } from './helpers/layerGuard/layerGuard.js';
import { runVaultRedirector } from './helpers/vaultRedirector/operations/runVaultRedirector.js';

export function orchestratePreToolUse(input: DispatchInput): MergedHookOutput {
  return orchestratePreToolUseBatch({
    ok: true,
    original: input,
    toolUses: [input],
  });
}

/**
 * PreToolUse: one physical call may contain multiple logical operations. Route
 * every operation in order, merge with deny-wins semantics, then run lifecycle
 * once using the original physical call as its matcher input.
 */
export function orchestratePreToolUseBatch(
  normalized: NormalizeCodexToolUsesResult<DispatchInput>,
): MergedHookOutput {
  if (!normalized.ok)
    return orchestrateMalformedPreToolUse(
      normalized.original,
      normalized.reason,
    );

  const results: HookConcernResult[] = [];
  for (const input of normalized.toolUses) {
    const tool = input.tool_name;

    if (tool === 'Write' || tool === 'Edit' || tool === 'Delete')
      results.push(
        safeConcern(input.cwd, 'layer-guard', () => runLayerGuard(input)),
      );

    if (tool === 'Read' || tool === 'Grep' || tool === 'Glob')
      results.push(
        safeConcern(input.cwd, 'vault-redirector', () =>
          runVaultRedirector(input),
        ),
      );
  }

  const lifecycleInput = normalized.original;
  results.push(
    safeConcern(lifecycleInput.cwd, 'lifecycle-dispatcher', () =>
      runLifecycleDispatcher('PreToolUse', lifecycleInput),
    ),
  );
  return mergeHookOutput('PreToolUse', results);
}

function orchestrateMalformedPreToolUse(
  original: DispatchInput,
  reason: string,
): MergedHookOutput {
  const cwd = original.cwd ?? process.cwd();
  const results: HookConcernResult[] = [
    safeConcern(cwd, 'lifecycle-dispatcher', () =>
      runLifecycleDispatcher('PreToolUse', original),
    ),
  ];

  if (isInsideMaencofVault(cwd))
    results.push({
      continue: false,
      reason:
        `${reason}. maencof cannot inspect this patch inside the vault; ` +
        're-emit it as a valid V4A patch (one `*** … File:` section per file).',
    });
  return mergeHookOutput('PreToolUse', results);
}
