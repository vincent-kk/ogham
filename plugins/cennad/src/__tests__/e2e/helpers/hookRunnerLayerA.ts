import { buildDynamicPayload } from '../../../hooks/injectDynamic/injectDynamic.js';
import { loadCounter } from '../../../hooks/injectDynamic/utils/loadCounter.js';
import { buildStaticPayload } from '../../../hooks/injectStatic/injectStatic.js';
import { loadConfig } from '../../../hooks/shared/loadConfig.js';
import type { HookProvider } from '../../../hooks/shared/providerOrder.js';

export type HookName = 'injectStatic' | 'injectDynamic';

export interface HookInput {
  /** UserPromptSubmit stdin payload; Layer B reads the real one. */
  prompt?: string;
  /**
   * Host provider. Pinned to claude by default rather than probed, so a runner
   * env that happens to carry a host signal cannot shift these expectations —
   * Layer B covers real detection.
   */
  self?: HookProvider;
}

export interface HookResult {
  continue: boolean;
  hookEventName?: 'SessionStart' | 'UserPromptSubmit';
  additionalContext?: string;
}

export function runHookLayerA(
  name: HookName,
  input: HookInput = {},
): HookResult {
  const self = input.self ?? 'claude';

  if (name === 'injectStatic')
    return {
      continue: true,
      hookEventName: 'SessionStart',
      additionalContext: buildStaticPayload(loadConfig(), self),
    };

  return {
    continue: true,
    hookEventName: 'UserPromptSubmit',
    additionalContext: buildDynamicPayload(
      loadConfig(),
      loadCounter(),
      input.prompt ?? '',
      self,
    ),
  };
}
