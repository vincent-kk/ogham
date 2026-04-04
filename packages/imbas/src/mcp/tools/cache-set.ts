/**
 * @file cache-set.ts
 * @description Write Jira metadata cache
 */

import { getCacheDir } from '../../core/paths.js';
import { saveCache } from '../../core/cache-manager.js';
import { join } from 'node:path';
import type { CacheType } from '../../types/cache.js';

export interface CacheSetInput {
  project_key: string;
  cache_type: CacheType;
  data?: unknown;
}

export async function handleCacheSet(input: CacheSetInput) {
  const cwd = process.cwd();
  const cacheDir = getCacheDir(cwd, input.project_key);

  if (input.data === undefined) {
    throw new Error('data is required');
  }
  await saveCache(cacheDir, input.cache_type, input.data);

  const cached_at = new Date().toISOString();
  const path = join(cacheDir, `${input.cache_type}.json`);

  return { path, cached_at };
}
