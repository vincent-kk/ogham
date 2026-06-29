import { readFile } from 'node:fs/promises';

import { DEFAULT_CONFIG } from '../../../constants/defaults.js';
import { CONFIG_PATH, FALLBACK_CONFIG_PATH } from '../../../constants/paths.js';
import { logger } from '../../../lib/logger.js';
import { type Config, ConfigSchema } from '../../../types/index.js';
import { isFileNotFound } from '../../../utils/isFileNotFound.js';
import { isPlainObject } from '../utils/isPlainObject.js';
import { mergeWithDefaults } from '../utils/mergeWithDefaults.js';

async function readConfigObject(path: string): Promise<unknown | undefined> {
  try {
    const text = await readFile(path, 'utf8');
    const config = JSON.parse(text);
    if (isPlainObject(config)) return config;
    logger.warn('config.json invalid, using fallback/defaults', {
      path,
    });
    return undefined;
  } catch (err) {
    if (isFileNotFound(err)) return undefined;
    logger.warn('config.json unreadable, using fallback/defaults', {
      path,
      error: (err as Error).message,
    });
    return undefined;
  }
}

async function readFallbackConfigObject(): Promise<unknown | undefined> {
  if (CONFIG_PATH === FALLBACK_CONFIG_PATH) return undefined;
  return readConfigObject(FALLBACK_CONFIG_PATH);
}

export async function loadConfig(): Promise<Config> {
  const config =
    (await readConfigObject(CONFIG_PATH)) ?? (await readFallbackConfigObject());
  if (config === undefined) return DEFAULT_CONFIG;

  const merged = mergeWithDefaults(config);
  const parsed = ConfigSchema.safeParse(merged);
  if (!parsed.success) {
    logger.warn('config.json invalid, using defaults', {
      issues: parsed.error.issues,
    });
    return DEFAULT_CONFIG;
  }
  return parsed.data;
}
