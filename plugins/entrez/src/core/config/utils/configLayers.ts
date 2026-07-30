import {
  resolveConfigLayers,
  type ConfigLayerPaths,
  tryProjectRoot,
} from "@ogham/cross-platform";

import { PLUGIN_DATA_DIR } from "../../../constants/paths.js";

/**
 * Both config files' absolute paths for the current workspace.
 *
 * The user layer stays in the plugin data dir where it has always been, so an
 * existing install needs no migration. The project layer lets one repository
 * declare its own tool name or contact email.
 *
 * `credentials.json` (the api_key) is NOT layered — it stays user-only. A
 * project layer lives in a working tree, one `git add .` from a commit.
 */
export function configLayers(
  projectRoot: string | null = tryProjectRoot(),
): ConfigLayerPaths {
  return resolveConfigLayers({
    pluginName: "entrez",
    projectRoot,
    userDir: PLUGIN_DATA_DIR,
  });
}
