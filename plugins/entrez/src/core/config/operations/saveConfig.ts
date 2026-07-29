import {
  buildConfigScopeState,
  writeConfigLayer,
} from "@ogham/cross-platform/config-scope";
import type {
  ConfigLayerPaths,
  ConfigScope,
  ConfigScopeState,
} from "@ogham/cross-platform/config-scope";

import type { EntrezConfigInput } from "../../../types/config.js";
import { configLayers } from "../utils/configLayers.js";
import { ensureProjectDirIgnored } from "../utils/ensureProjectDirIgnored.js";

/**
 * Persist one config layer with owner-only permissions (0o600) and return the
 * resulting state. `email` is a sensitive identifier, so both layers are
 * protected from other local users.
 *
 * The document is written as given: a project layer is partial by design, so
 * validation belongs to the caller, on the merged result. The project
 * directory also gets an ignore file on creation — that layer lives in a
 * working tree where `git add .` is one keystroke.
 */
export async function saveConfig(
  scope: ConfigScope,
  config: Partial<EntrezConfigInput>,
  layers: ConfigLayerPaths = configLayers(),
): Promise<ConfigScopeState> {
  if (scope === "project" && layers.project !== null)
    ensureProjectDirIgnored(layers.project);

  writeConfigLayer(layers, scope, config as Record<string, unknown>, {
    fileMode: 0o600,
  });
  return buildConfigScopeState(layers);
}
