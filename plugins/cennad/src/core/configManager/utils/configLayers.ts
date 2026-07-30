import {
  type ConfigLayerPaths,
  resolveConfigLayers,
  tryProjectRoot,
} from '@ogham/cross-platform';

import { CENNAD_HOME } from '../../../constants/paths.js';

/**
 * Where cennad's two config layers live for the current workspace.
 *
 * The user layer stays at `CENNAD_HOME`, which `CENNAD_CONFIG_PATH` may
 * relocate — that env override is a choice about where the *user* config
 * lives, not a third namespace, so it is passed through as `userDir` rather
 * than mixed into the merge. The read-only fallback to the default home
 * stays inside the user layer for the same reason.
 *
 * The project root is reached for rather than passed in: `loadConfig` is
 * called from tool handlers and hook entries that have no workspace argument
 * to thread. When nothing supplied one the project layer switches off. Pass
 * `projectRoot` explicitly in tests so a run never writes into the
 * repository it happens to execute from.
 */
export function configLayers(
  projectRoot: string | null = tryProjectRoot(),
): ConfigLayerPaths {
  return resolveConfigLayers({
    pluginName: 'cennad',
    projectRoot,
    userDir: CENNAD_HOME,
  });
}
