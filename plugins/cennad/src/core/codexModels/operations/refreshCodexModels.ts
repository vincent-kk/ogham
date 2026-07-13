import { spawnCli } from '@ogham/cross-platform';

import { CODEX_MODELS_CACHE_PATH } from '../../../constants/paths.js';
import { atomicWrite } from '../../../lib/atomicWrite.js';
import { logger } from '../../../lib/logger.js';
import type { CodexModel, CodexModelsCache } from '../../../types/index.js';
import { parseCodexModels } from '../utils/parseCodexModels.js';

const REFRESH_TIMEOUT_MS = 15_000;

export async function refreshCodexModels(now: number): Promise<CodexModel[]> {
  try {
    const result = await spawnCli('codex', ['debug', 'models'], {
      timeoutMs: REFRESH_TIMEOUT_MS,
    });
    if (result.timedOut || result.spawnError || (result.code ?? 0) !== 0) {
      logger.warn('codex debug models refresh failed', {
        code: result.code,
        timedOut: result.timedOut,
        spawnError: result.spawnError?.message,
        stderr: result.stderr.slice(0, 200),
      });
      return [];
    }

    const models = parseCodexModels(result.stdout);
    if (models.length === 0) {
      logger.warn('codex debug models returned no parseable models', {
        stdoutLength: result.stdout.length,
      });
      return [];
    }
    return writeCache(models, now);
  } catch (err) {
    logger.warn('codex debug models refresh threw', {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

async function writeCache(
  models: CodexModel[],
  now: number,
): Promise<CodexModel[]> {
  const cache: CodexModelsCache = { models, fetched_at: now };
  try {
    await atomicWrite(
      CODEX_MODELS_CACHE_PATH,
      `${JSON.stringify(cache, null, 2)}\n`,
    );
  } catch (err) {
    logger.warn('codex models cache write failed', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
  return models;
}
