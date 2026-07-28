import { resolveConfigLayers } from "@ogham/cross-platform/config-scope";
import type { ConfigLayerPaths } from "@ogham/cross-platform/config-scope";

import { CONFIG_DIR, CONFIG_FILE } from "../defaults/defaults.js";

/**
 * Both config files' absolute paths for a project.
 *
 * The project layer stays at `<projectRoot>/.maencof-lens/config.json`, where
 * it has always been, so an existing checkout needs no migration. The user
 * layer holds the vaults a person reaches for in every project.
 */
export function configLayers(projectRoot: string): ConfigLayerPaths {
  return resolveConfigLayers({
    pluginName: "maencof-lens",
    projectRoot,
    projectDirName: CONFIG_DIR,
    fileName: CONFIG_FILE,
  });
}
