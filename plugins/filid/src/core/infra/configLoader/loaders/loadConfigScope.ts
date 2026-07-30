import {
  type ConfigScopeState,
  buildConfigScopeState,
} from '@ogham/cross-platform';

import { configLayers } from '../utils/configLayers.js';

/**
 * Both config layers as the settings page needs them: each file's raw
 * document, the merge, and the dot paths the project layer overrode.
 *
 * Raw rather than validated on purpose — the page shows what is in each
 * file. Whether the merge is valid is `loadConfig`'s answer.
 */
export function loadConfigScope(projectRoot: string): ConfigScopeState {
  return buildConfigScopeState(configLayers(projectRoot));
}
