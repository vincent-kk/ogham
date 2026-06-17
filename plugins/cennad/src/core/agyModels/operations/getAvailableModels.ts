import { readFile } from 'node:fs/promises';

import { AGY_MODELS_CACHE_PATH } from '../../../constants/paths.js';
import {
  type AgyModelsCache,
  AgyModelsCacheSchema,
} from '../../../types/index.js';
import { isFileNotFound } from '../../../utils/isFileNotFound.js';

import { refreshModels } from './refreshModels.js';

const TTL_MS = 60 * 60 * 1000; // 1 hour

// Returns currently available Antigravity model full-names. Serves a fresh
// cache within TTL, otherwise re-runs `agy models`; on refresh failure falls
// back to a stale cache, then to an empty list. Never throws.
export async function getAvailableModels(): Promise<string[]> {
  const now = Date.now();
  const cached = await readCache();
  if (cached && now - cached.fetched_at < TTL_MS) {
    return cached.models;
  }
  const fresh = await refreshModels(now);
  if (fresh.length > 0) return fresh;
  return cached?.models ?? [];
}

async function readCache(): Promise<AgyModelsCache | null> {
  try {
    const text = await readFile(AGY_MODELS_CACHE_PATH, 'utf8');
    const parsed = AgyModelsCacheSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch (err) {
    if (isFileNotFound(err)) return null;
    return null;
  }
}
