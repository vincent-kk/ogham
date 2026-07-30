import {
  resolveConfigLayers,
  type ConfigLayerPaths,
  tryProjectRoot,
} from "@ogham/cross-platform";

import { PLUGIN_DATA_DIR } from "../../../constants/index.js";

/**
 * Both config files' absolute paths for the current workspace.
 *
 * The user layer stays in the plugin data dir where it has always been, so an
 * existing install needs no migration. The project layer lets one repository
 * point at a different Atlassian site than the person's default.
 *
 * Credentials are NOT layered — they stay user-only. A project layer lives in
 * a working tree and would put a secret one `git add .` away from a commit.
 *
 * The project root is reached for rather than passed in: the setup tool and
 * every fetch context resolve it the same way, and threading it through would
 * touch call sites that have no opinion about it.
 */
export function configLayers(
  projectRoot: string | null = tryProjectRoot(),
): ConfigLayerPaths {
  return resolveConfigLayers({
    pluginName: "atlassian",
    projectRoot,
    userDir: PLUGIN_DATA_DIR,
  });
}
