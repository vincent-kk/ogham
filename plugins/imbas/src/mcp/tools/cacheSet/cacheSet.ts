/**
 * @file cacheSet.ts
 * @description Write Jira metadata cache
 */
import { join } from 'node:path';

import { projectRoot } from '@ogham/cross-platform/host-paths';

import { saveCache } from '../../../core/cacheManager/cacheManager.js';
import { getCacheDir } from '../../../core/paths/paths.js';
import type { CacheType } from '../../../types/cache.js';

export interface CacheSetInput {
  project_ref: string;
  cache_type: CacheType;
  data?: unknown;
  project_root?: string;
}

export async function handleCacheSet(input: CacheSetInput) {
  const cwd = projectRoot(input.project_root);
  const cacheDir = getCacheDir(cwd, input.project_ref);

  if (input.data === undefined) throw new Error('data is required');

  await saveCache(cacheDir, input.cache_type, input.data);

  const cached_at = new Date().toISOString();
  const path = join(cacheDir, `${input.cache_type}.json`);

  return { path, cached_at };
}
