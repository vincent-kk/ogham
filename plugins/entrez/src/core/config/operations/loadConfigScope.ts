import {
  buildConfigScopeState,
  type ConfigLayerPaths,
  type ConfigScopeState,
} from "@ogham/cross-platform";

import { configLayers } from "../utils/configLayers.js";

/**
 * Both config layers plus the merge, for callers that need to show which file
 * said what rather than just whether the install is configured.
 */
export function loadConfigScope(
  layers: ConfigLayerPaths = configLayers(),
): ConfigScopeState {
  return buildConfigScopeState(layers);
}
