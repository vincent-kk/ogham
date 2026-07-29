import { buildConfigScopeState } from "@ogham/cross-platform/config-scope";
import type {
  ConfigLayerPaths,
  ConfigScopeState,
} from "@ogham/cross-platform/config-scope";

import { configLayers } from "../utils/configLayers.js";

/**
 * Both layers plus the merged result, as the settings page needs them.
 *
 * `loadConfig` answers "what is in effect"; this answers "which layer said so",
 * which is what the scope toggle and the inheritance badges are drawn from.
 * No migration runs here — the page reads what is on disk, and `loadConfig` on
 * the same server has already upgraded a legacy user layer.
 */
export function loadConfigState(
  layers: ConfigLayerPaths = configLayers(),
): ConfigScopeState {
  return buildConfigScopeState(layers);
}
