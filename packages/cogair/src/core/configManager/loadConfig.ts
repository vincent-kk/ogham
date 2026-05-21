import { readFile } from 'node:fs/promises';

import { DEFAULT_CONFIG } from '../../constants/defaults.js';
import { CONFIG_PATH } from '../../constants/paths.js';
import { logger } from '../../lib/logger.js';
import { type Config, ConfigSchema } from '../../types/index.js';
import { isFileNotFound } from '../../utils/isFileNotFound.js';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function mergeWithDefaults(raw: unknown): unknown {
  if (!isPlainObject(raw)) return DEFAULT_CONFIG;
  return {
    ratio: {
      ...DEFAULT_CONFIG.ratio,
      ...(isPlainObject(raw.ratio) ? raw.ratio : {}),
    },
    intervention_strength:
      raw.intervention_strength ?? DEFAULT_CONFIG.intervention_strength,
    keywords: {
      ...DEFAULT_CONFIG.keywords,
      ...(isPlainObject(raw.keywords) ? raw.keywords : {}),
    },
    default_model: raw.default_model ?? DEFAULT_CONFIG.default_model,
    default_options: {
      ...DEFAULT_CONFIG.default_options,
      ...(isPlainObject(raw.default_options) ? raw.default_options : {}),
    },
    session_ttl_hours:
      raw.session_ttl_hours ?? DEFAULT_CONFIG.session_ttl_hours,
  };
}

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
