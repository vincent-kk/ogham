import { readFile } from 'node:fs/promises';

import type { ConfigLayerPaths } from '@ogham/cross-platform/config-scope';
import { mergeConfigLayers } from '@ogham/cross-platform/config-scope/merge';

import { DEFAULT_CONFIG } from '../../../constants/defaults.js';
import { FALLBACK_CONFIG_PATH } from '../../../constants/paths.js';
import { logger } from '../../../lib/logger.js';
import { type Config, ConfigSchema } from '../../../types/index.js';
import { isFileNotFound } from '../../../utils/isFileNotFound.js';
import { configLayers } from '../utils/configLayers.js';
import { isPlainObject } from '../utils/isPlainObject.js';
import { mergeWithDefaults } from '../utils/mergeWithDefaults.js';

async function readConfigObject(
  path: string,
): Promise<Record<string, unknown> | null> {
  try {
    const text = await readFile(path, 'utf8');
    const config: unknown = JSON.parse(text);
    if (isPlainObject(config)) return config as Record<string, unknown>;
    logger.warn('config.json invalid, using fallback/defaults', { path });
    return null;
  } catch (err) {
    if (isFileNotFound(err)) return null;
    logger.warn('config.json unreadable, using fallback/defaults', {
      path,
      error: (err as Error).message,
    });
    return null;
  }
}

/**
 * The user layer, with the read-only fallback to the default home.
 *
 * The fallback is a choice about which file *is* the user config when
 * `CENNAD_CONFIG_PATH` points somewhere empty — not a third namespace. It
 * resolves before the project layer is merged, so a project override never
 * has to reason about which user file it is layered on.
 */
async function readUserLayer(
  userPath: string,
): Promise<Record<string, unknown> | null> {
  const active = await readConfigObject(userPath);
  if (active !== null) return active;
  if (userPath === FALLBACK_CONFIG_PATH) return null;
  return readConfigObject(FALLBACK_CONFIG_PATH);
}

/**
 * The config in effect: the user layer with the project layer laid over it.
 *
 * Only the merged result is validated and normalized — a project layer
 * carries just the keys it overrides, so `mergeWithDefaults` and the schema
 * run once, after the merge, exactly as they did when there was one file.
 */
export async function loadConfig(
  layers: ConfigLayerPaths = configLayers(),
): Promise<Config> {
  const user = await readUserLayer(layers.user);
  const project =
    layers.project === null ? null : await readConfigObject(layers.project);
  if (user === null && project === null) return DEFAULT_CONFIG;

  const merged = mergeWithDefaults(mergeConfigLayers(user, project));
  const parsed = ConfigSchema.safeParse(merged);
  if (!parsed.success) {
    logger.warn('config.json invalid, using defaults', {
      issues: parsed.error.issues,
    });
    return DEFAULT_CONFIG;
  }
  return parsed.data;
}
