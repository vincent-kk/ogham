import { buildConfigScopeState } from '@ogham/cross-platform/config-scope';
import type {
  ConfigLayerPaths,
  ConfigScopeState,
} from '@ogham/cross-platform/config-scope';

import { configLayers } from '../utils/configLayers.js';

/**
 * Both config layers plus the merge, as the settings page needs them.
 *
 * `loadConfig` answers "what is in effect"; this answers "which layer said
 * so", which is what the scope toggle and the inheritance badges draw from.
 * Raw documents, not normalized ones — the page shows what is in each file,
 * and `mergeWithDefaults` belongs to the read path.
 */
export function loadConfigState(
  layers: ConfigLayerPaths = configLayers(),
): ConfigScopeState {
  return buildConfigScopeState(layers);
}
