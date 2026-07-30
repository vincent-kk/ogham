import {
  buildConfigScopeState,
  writeConfigLayer,
  type ConfigLayerPaths,
  type ConfigScope,
  type ConfigScopeState,
} from "@ogham/cross-platform";

import { DIR_MODE, FILE_MODE } from "../../../constants/defaults.js";
import { CONFIG_VERSION } from "../../../types/config.js";
import { configLayers } from "../utils/configLayers.js";

/**
 * Persist one config layer and return the state the caller should render next.
 *
 * The document is written as given — validation belongs to the caller, because
 * a project layer holds only the overridden keys and cannot satisfy the strict
 * schema on its own. What the settings page validates is the merged preview.
 *
 * Only the user layer carries `config_version`. It is the baseline that can
 * predate versioning, and stamping a partial project override would surface the
 * version in the UI as an override nobody chose.
 */
export async function saveConfig(
  scope: ConfigScope,
  document: Record<string, unknown>,
  layers: ConfigLayerPaths = configLayers(),
): Promise<ConfigScopeState> {
  const stamped =
    scope === "user"
      ? { ...document, config_version: CONFIG_VERSION }
      : document;
  writeConfigLayer(layers, scope, stamped, {
    fileMode: FILE_MODE,
    directoryMode: DIR_MODE,
  });
  return buildConfigScopeState(layers);
}
