/**
 * @file core/cache-manager.ts
 * @description Cache CRUD + TTL management for Jira metadata
 * @see skills/imbas-cache/references/cache-structure.md
 */
import { readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import {
  CACHED_AT_FILENAME,
  CACHE_FILE_MAP,
  DEFAULT_CACHE_TTL_HOURS,
} from '../../constants/index.js';
import { readJson, writeJson } from '../../lib/file-io.js';
import { CachedAtSchema } from '../../types/cache.js';
import type { CacheType } from '../../types/cache.js';

/** Load a specific cache file. For 'all', merges all available cache files. */
export async function loadCache(
  cacheDir: string,
  cacheType: CacheType,
): Promise<unknown> {
  if (cacheType === 'all') {
    const result: Record<string, unknown> = {};
    for (const [key, filename] of Object.entries(CACHE_FILE_MAP)) {
      try {
        result[key] = await readJson(join(cacheDir, filename));
      } catch {
        // skip missing cache files
      }
    }
    return result;
  }

  const filename = CACHE_FILE_MAP[cacheType];
  if (!filename) {
    throw new Error(`Unknown cache type: ${cacheType}`);
  }
  return readJson(join(cacheDir, filename));
}

/** Write a cache file and update cached_at.json timestamp */
export async function saveCache(
  cacheDir: string,
  cacheType: string,
  data: unknown,
): Promise<void> {
  const filename = CACHE_FILE_MAP[cacheType];
  if (!filename) {
    throw new Error(`Unknown cache type: ${cacheType}`);
  }

  await writeJson(join(cacheDir, filename), data);

  // Update cached_at.json
  let ttlHours = DEFAULT_CACHE_TTL_HOURS;
  try {
    const existing = await readJson(
      join(cacheDir, CACHED_AT_FILENAME),
      CachedAtSchema,
    );
    ttlHours = existing.ttl_hours ?? DEFAULT_CACHE_TTL_HOURS;
  } catch {
    // use defaults
  }

  await writeJson(join(cacheDir, CACHED_AT_FILENAME), {
    cached_at: new Date().toISOString(),
    ttl_hours: ttlHours,
  });
}

/** Returns true if cached_at.json is missing or TTL has expired */
export async function isCacheExpired(cacheDir: string): Promise<boolean> {
  try {
    const cachedAt = await readJson(
      join(cacheDir, CACHED_AT_FILENAME),
      CachedAtSchema,
    );
    const cachedTime = new Date(cachedAt.cached_at).getTime();
    const ttlMs =
      (cachedAt.ttl_hours ?? DEFAULT_CACHE_TTL_HOURS) * 60 * 60 * 1000;
    return Date.now() - cachedTime > ttlMs;
  } catch {
    return true;
  }
}

/** Remove all cache files from cacheDir */
export async function clearCache(cacheDir: string): Promise<void> {
  let entries: string[];
  try {
    entries = readdirSync(cacheDir);
  } catch {
    return;
  }

  for (const entry of entries) {
    try {
      rmSync(join(cacheDir, entry), { force: true });
    } catch {
      // best effort
    }
  }
}
