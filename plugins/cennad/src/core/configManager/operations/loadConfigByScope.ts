import type { ConfigLayerPaths } from '@ogham/cross-platform/config-scope';

import type { Config } from '../../../types/index.js';
import { configLayers } from '../utils/configLayers.js';

import { loadConfig } from './loadConfig.js';

/** The document the settings form shows for each scope. */
export interface ConfigByScope {
  /** What the user layer decides on its own; the project file is not read. */
  readonly user: Config;
  /** What is actually in force — the project layer laid over the user one. */
  readonly project: Config;
}

/**
 * The config each layer resolves to, as the settings page needs it.
 *
 * The user view is the same loader run with the project coordinate switched
 * off. Normalization, defaults and the read-only fallback home stay in one
 * place that way — a second assembly of the same document is how the value on
 * screen starts to differ from the value in force.
 *
 * @param layers Absolute paths of both layer files; omitted uses the default
 *   coordinates for the current workspace.
 * @returns Both views. `project` equals what `loadConfig` returns.
 */
export async function loadConfigByScope(
  layers: ConfigLayerPaths = configLayers(),
): Promise<ConfigByScope> {
  const [user, project] = await Promise.all([
    loadConfig({ user: layers.user, project: null }),
    loadConfig(layers),
  ]);
  return { user, project };
}
