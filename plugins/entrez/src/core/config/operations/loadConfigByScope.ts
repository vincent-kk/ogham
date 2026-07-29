import type { ConfigLayerPaths } from "@ogham/cross-platform/config-scope";

import type { EntrezConfig } from "../../../types/config.js";
import { configLayers } from "../utils/configLayers.js";

import { loadConfig } from "./loadConfig.js";

/** The config each layer resolves to, as the settings page needs it. */
export interface ConfigByScope {
  /** What the user layer decides on its own; the project file is not read. */
  readonly user: EntrezConfig | null;
  /** What is actually in force — the project layer laid over the user one. */
  readonly project: EntrezConfig | null;
}

/**
 * Both views of the config, for a page that shows one layer at a time.
 *
 * The user view is the same loader run with the project coordinate switched
 * off, so validation and the "not configured yet" rule stay in one place. A
 * layer that cannot satisfy the schema alone reports `null`, which the page
 * reads as an unconfigured layer and offers empty fields for.
 *
 * @param layers Absolute paths of both layer files; omitted uses the defaults.
 * @returns Both views. `project` is what `loadConfig` returns.
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
