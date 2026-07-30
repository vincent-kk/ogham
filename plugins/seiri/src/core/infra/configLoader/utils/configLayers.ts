import {
  type ConfigLayerPaths,
  resolveConfigLayers,
} from '@ogham/cross-platform';

import { CONFIG_DIR, CONFIG_FILE } from '../../../../constants/files.js';
import { findRepoRoot } from '../../../utils/findRepoRoot.js';

/**
 * Both dial files' absolute paths for a project.
 *
 * The project layer is anchored at the repository root, not at the caller's
 * directory, so the dial a team commits applies from every subdirectory of
 * the checkout. The user layer sits in the host state root and applies to
 * every project the person opens.
 */
export function configLayers(projectRoot: string): ConfigLayerPaths {
  return resolveConfigLayers({
    pluginName: 'seiri',
    projectRoot: findRepoRoot(projectRoot),
    projectDirName: CONFIG_DIR,
    fileName: CONFIG_FILE,
  });
}
