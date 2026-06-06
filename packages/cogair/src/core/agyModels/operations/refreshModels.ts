import { spawnCli } from '@ogham/cross-platform';

import { AGY_MODELS_CACHE_PATH } from '../../../constants/paths.js';
import { atomicWrite } from '../../../lib/atomicWrite.js';
import { logger } from '../../../lib/logger.js';
import type { AgyModelsCache } from '../../../types/index.js';
import { parseModels } from '../utils/parseModels.js';

const REFRESH_TIMEOUT_MS = 15_000;
const MAX_ATTEMPTS = 3;

export async function refreshModels(now: number): Promise<string[]> {
  try {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const result = await spawnCli('agy', ['models'], {
        timeoutMs: REFRESH_TIMEOUT_MS,
      });
      if (result.timedOut || result.spawnError || (result.code ?? 0) !== 0) {
        logger.warn('agy models refresh failed', {
          attempt,
          code: result.code,
          timedOut: result.timedOut,
          spawnError: result.spawnError?.message,
          stderr: result.stderr.slice(0, 200),
        });
        return [];
      }
      const models = parseModels(result.stdout);
      if (models.length > 0) return writeCache(models, now);
      const fromStderr = parseModels(result.stderr);
      if (fromStderr.length > 0) return writeCache(fromStderr, now);
      logger.warn('agy models returned no parseable models', {
        attempt,
        stdoutLength: result.stdout.length,
        stderrLength: result.stderr.length,
      });
    }
    return [];
  } catch (err) {
    logger.warn('agy models refresh threw', {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

async function writeCache(models: string[], now: number): Promise<string[]> {
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
}
