import {
  mergeConfigLayers,
  readConfigLayers,
} from "@ogham/cross-platform/config-scope";
import type { ConfigLayerPaths } from "@ogham/cross-platform/config-scope";

import { DEFAULT_CONFIG } from "../../../constants/defaults.js";
import { logger } from "../../../lib/logger.js";
import { type Config, ConfigSchema } from "../../../types/config.js";
import { configLayers } from "../utils/configLayers.js";

import { migrateUserLayer } from "./migrateUserLayer.js";

/**
 * The config in effect: the user layer with the project layer laid over it.
 *
 * Composed from the two primitives rather than `buildConfigScopeState`, because
 * migration has to run between reading the user layer and merging — migrating
 * the merged result would copy project overrides into the user baseline.
 *
 * Never throws. A missing config is the normal first-run state and a damaged
 * one must not take the session down, so both degrade to DEFAULT_CONFIG with a
 * warning. Only the merged result is validated; the project layer holds just
 * the overridden keys and cannot satisfy the strict schema alone.
 */
export async function loadConfig(
  layers: ConfigLayerPaths = configLayers(),
): Promise<Config> {
  const documents = readConfigLayers(layers);
  for (const warning of documents.warnings) logger.warn(warning);

  const user = await migrateUserLayer(layers, documents.user);
  const parsed = ConfigSchema.safeParse(
    mergeConfigLayers(user, documents.project),
  );
  if (!parsed.success) {
    logger.warn("merged config invalid, using defaults", {
      issues: parsed.error.issues,
    });
    return DEFAULT_CONFIG;
  }
  return parsed.data;
}
