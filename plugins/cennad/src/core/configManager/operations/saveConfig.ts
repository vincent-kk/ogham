import {
  type ConfigLayerPaths,
  type ConfigScope,
  type ConfigScopeState,
  buildConfigScopeState,
  writeConfigLayer,
} from '@ogham/cross-platform';

import { configLayers } from '../utils/configLayers.js';

/**
 * Persist one config layer and return the state the caller should render.
 *
 * The document is written as given. Validation belongs to the caller because
 * a project layer holds only the keys it overrides and cannot satisfy the
 * strict schema alone — what the settings page validates is the merged
 * preview. The user layer always lands in the active `CENNAD_HOME`, never in
 * the read-only fallback that `loadConfig` may have read from.
 */
export async function saveConfig(
  scope: ConfigScope,
  document: Record<string, unknown>,
  layers: ConfigLayerPaths = configLayers(),
): Promise<ConfigScopeState> {
  writeConfigLayer(layers, scope, document);
  return buildConfigScopeState(layers);
}
