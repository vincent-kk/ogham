import { configLayers } from '../utils/configLayers.js';

import type { LoadConfigResult } from './configTypes.js';
import { loadConfig } from './loadConfig.js';

/** The config each layer resolves to, as the settings page needs it. */
export interface ConfigByScope {
  /** What the user layer decides on its own; the project file is not read. */
  readonly user: LoadConfigResult;
  /** What is actually in force — the project layer laid over the user one. */
  readonly project: LoadConfigResult;
}

/**
 * Both views of the config, for a page that shows one layer at a time.
 *
 * The user view is the same loader run with the project coordinate switched
 * off. Validation, v1 migration and exempt sanitizing stay in one place that
 * way — a second assembly of the same document is how the value on screen
 * starts to differ from the value in force.
 *
 * @param projectRoot Anchor for the project layer of both views.
 * @returns Both views. `project` equals what `loadConfig` returns.
 */
export function loadConfigByScope(projectRoot: string): ConfigByScope {
  const layers = configLayers(projectRoot);
  return {
    user: loadConfig(projectRoot, { user: layers.user, project: null }),
    project: loadConfig(projectRoot, layers),
  };
}
