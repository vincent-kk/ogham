import {
  buildConfigScopeState,
  mergeConfigLayers,
  readConfigLayers,
  writeConfigLayer,
  type ConfigScope,
  type ConfigScopeState,
} from "@ogham/cross-platform";

import {
  isValidLensConfig,
  normalizeLensConfig,
} from "../configSchema/guard/configGuard.js";
import type { LensConfig } from "../configSchema/index.js";
import { CONFIG_VERSION, DEFAULT_LAYERS } from "../defaults/index.js";

import { configLayers } from "./utils/configLayers.js";

/**
 * Load the config in effect: the user layer with the project layer over it.
 *
 * Returns null when neither layer describes a usable config — the caller
 * treats that as "no vaults configured", which is unchanged.
 *
 * `vaults` is an array, so a project layer that names it replaces the whole
 * list rather than adding to it. That is what lets a project narrow the
 * vault set; a project that wants the personal list simply omits the key.
 */
export function loadConfig(projectRoot: string): LensConfig | null {
  const documents = readConfigLayers(configLayers(projectRoot));
  if (documents.user === null && documents.project === null) return null;

  const merged = mergeConfigLayers(documents.user, documents.project);
  if (!isValidLensConfig(merged)) return null;
  return normalizeLensConfig(merged);
}

/** Both layers plus the merge, for callers that show which file said what. */
export function loadConfigScope(projectRoot: string): ConfigScopeState {
  return buildConfigScopeState(configLayers(projectRoot));
}

/**
 * Write one config layer and return the path written.
 *
 * The scope is required rather than defaulted: both layers are valid targets
 * and a silent default would put a project's vault list in the personal
 * config or the reverse.
 * @param projectRoot Host workspace root used to resolve both config layers.
 * @param scope Explicit destination layer; project values override user values.
 * @param config Proposed layer document, stored without normalization.
 * @returns The path written after the effective merged config passes its guard.
 * @throws Error naming the scope when the merge has no valid vault list; no file is written.
 */
export function writeConfig(
  projectRoot: string,
  scope: ConfigScope,
  config: LensConfig,
): string {
  const layers = configLayers(projectRoot);
  const documents = readConfigLayers(layers);
  const document = { ...config };
  const merged =
    scope === "user"
      ? mergeConfigLayers(document, documents.project)
      : mergeConfigLayers(documents.user, document);
  if (!isValidLensConfig(merged))
    throw new Error(
      `Cannot write ${scope} config: merged configuration has no valid vault list.`,
    );
  return writeConfigLayer(layers, scope, document);
}

/**
 * Create a default config with a single vault entry.
 */
export function createDefaultConfig(
  vaultPath: string,
  vaultName: string,
): LensConfig {
  return {
    version: CONFIG_VERSION,
    vaults: [
      {
        name: vaultName,
        path: vaultPath,
        layers: [...DEFAULT_LAYERS],
        default: true,
      },
    ],
  };
}
