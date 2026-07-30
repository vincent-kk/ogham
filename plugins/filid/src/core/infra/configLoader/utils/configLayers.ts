import {
  type ConfigLayerPaths,
  resolveConfigLayers,
} from '@ogham/cross-platform';

import {
  CONFIG_DIR,
  CONFIG_FILE,
} from '../../../../constants/infraDefaults.js';

import { resolveGitRoot } from './resolveGitRoot.js';

/**
 * Both config files' absolute paths for a project.
 *
 * The project layer stays anchored at the git root, exactly where
 * `.filid/config.json` has always been written, so an existing checkout
 * needs no migration. The user layer sits in the host state root and
 * supplies defaults for every project that has not made its own decision.
 */
export function configLayers(projectRoot: string): ConfigLayerPaths {
  return resolveConfigLayers({
    pluginName: 'filid',
    projectRoot: resolveGitRoot(projectRoot),
    projectDirName: CONFIG_DIR,
    fileName: CONFIG_FILE,
  });
}
