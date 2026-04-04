/**
 * @file cache-get.ts
 * @description Read Jira metadata cache
 */

import { loadConfig } from '../../core/config-manager.js';
import { getCacheDir } from '../../core/paths.js';
import { loadCache, isCacheExpired } from '../../core/cache-manager.js';
import { readJson } from '../../lib/file-io.js';
import { join } from 'node:path';
import { CACHED_AT_FILENAME } from '../../constants/index.js';
import { CachedAtSchema } from '../../types/cache.js';
import type { CacheType } from '../../types/cache.js';

export interface CacheGetInput {
  project_ref?: string;
  cache_type?: CacheType;
}

export async function handleCacheGet(input: CacheGetInput) {
  const cwd = process.cwd();

  let project_ref = input.project_ref;
  if (!project_ref) {
    const config = await loadConfig(cwd);
    project_ref = config.defaults.project_ref ?? undefined;
    if (!project_ref) {
      throw new Error('project_ref is required (or set defaults.project_ref in config)');
    }
  }

  const cache_type: CacheType = input.cache_type ?? 'all';

  const cacheDir = getCacheDir(cwd, project_ref);
  const cache = await loadCache(cacheDir, cache_type);
  const ttl_expired = await isCacheExpired(cacheDir);

  let cached_at: string | null = null;
  try {
    const meta = await readJson(join(cacheDir, CACHED_AT_FILENAME), CachedAtSchema);
    cached_at = meta.cached_at;
  } catch {
    // no cached_at.json yet
  }

  return { cache, cached_at, ttl_expired };
}
