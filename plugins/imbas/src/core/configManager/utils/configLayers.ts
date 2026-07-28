import { resolveConfigLayers } from '@ogham/cross-platform/config-scope';
import type { ConfigLayerPaths } from '@ogham/cross-platform/config-scope';

import {
  CONFIG_FILENAME,
  IMBAS_ROOT_DIRNAME,
} from '../../../constants/index.js';

/**
 * Both config files' absolute paths for a workspace.
 *
 * The project layer stays at `<cwd>/.imbas/config.json`, exactly where it has
 * always been written, so an existing workspace needs no migration. The user
 * layer sits in the host state root and supplies defaults to every workspace
 * that has not made its own decision.
 *
 * `cwd` is passed in rather than reached for: every imbas entry point already
 * resolves the workspace through `projectRoot()` before calling in.
 */
export function configLayers(cwd: string): ConfigLayerPaths {
  return resolveConfigLayers({
    pluginName: 'imbas',
    projectRoot: cwd,
    projectDirName: IMBAS_ROOT_DIRNAME,
    fileName: CONFIG_FILENAME,
  });
}
