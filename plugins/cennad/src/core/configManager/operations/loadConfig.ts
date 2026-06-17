import { readFile } from 'node:fs/promises';

import { DEFAULT_CONFIG } from '../../../constants/defaults.js';
import { CONFIG_PATH } from '../../../constants/paths.js';
import { logger } from '../../../lib/logger.js';
import { type Config, ConfigSchema } from '../../../types/index.js';
import { isFileNotFound } from '../../../utils/isFileNotFound.js';
import { mergeWithDefaults } from '../utils/mergeWithDefaults.js';

export async function loadConfig(): Promise<Config> {
  let raw: unknown;
  try {
    const text = await readFile(CONFIG_PATH, 'utf8');
    raw = JSON.parse(text);
  } catch (err) {
    if (isFileNotFound(err)) return DEFAULT_CONFIG;
    logger.warn('config.json unreadable, using defaults', {
      error: (err as Error).message,
    });
    return DEFAULT_CONFIG;
  }

  const merged = mergeWithDefaults(raw);
  const parsed = ConfigSchema.safeParse(merged);
  if (!parsed.success) {
    logger.warn('config.json invalid, using defaults', {
      issues: parsed.error.issues,
    });
    return DEFAULT_CONFIG;
  }
  return parsed.data;
}
