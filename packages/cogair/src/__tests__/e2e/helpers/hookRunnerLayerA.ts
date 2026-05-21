import { buildDynamicPayload } from '../../../hooks/injectDynamic/injectDynamic.js';
import { loadCounter } from '../../../hooks/injectDynamic/utils/loadCounter.js';
import { buildStaticPayload } from '../../../hooks/injectStatic/injectStatic.js';
import { loadConfig } from '../../../hooks/shared/loadConfig.js';

export type HookName = 'injectStatic' | 'injectDynamic';

export interface HookResult {
  continue: boolean;
  hookEventName?: 'SessionStart' | 'UserPromptSubmit';
  additionalContext?: string;
}

export function runHookLayerA(name: HookName): HookResult {
  if (name === 'injectStatic') {
    return {
      continue: true,
      hookEventName: 'SessionStart',
      additionalContext: buildStaticPayload(loadConfig()),
    };
  }
  return {
    continue: true,
    hookEventName: 'UserPromptSubmit',
    additionalContext: buildDynamicPayload(loadConfig(), loadCounter()),
  };
}
