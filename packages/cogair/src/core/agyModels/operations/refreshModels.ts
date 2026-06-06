import { spawnCli } from '@ogham/cross-platform';

import { AGY_MODELS_CACHE_PATH } from '../../../constants/paths.js';
import { atomicWrite } from '../../../lib/atomicWrite.js';
import { logger } from '../../../lib/logger.js';
import type { AgyModelsCache } from '../../../types/index.js';
import { parseModels } from '../utils/parseModels.js';

const REFRESH_TIMEOUT_MS = 15_000;

// Runs `agy models`, parses the model list, and writes the cache. Never throws:
// any spawn/parse/write failure resolves to an empty list so callers (settings
// UI, auto-tier selection) degrade gracefully when agy is missing or unauthed.
export async function refreshModels(now: number): Promise<string[]> {
  try {
    const result = await spawnCli('agy', ['models'], {
      timeoutMs: REFRESH_TIMEOUT_MS,
    });
    if (result.timedOut || result.spawnError || (result.code ?? 0) !== 0) {
      return [];
    }
    const models = parseModels(result.stdout);
    const cache: AgyModelsCache = { models, fetched_at: now };
    try {
      await atomicWrite(
        AGY_MODELS_CACHE_PATH,
        `${JSON.stringify(cache, null, 2)}\n`,
      );
    } catch (err) {
      logger.warn('agy models cache write failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
    return models;
  } catch (err) {
    logger.warn('agy models refresh failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}
