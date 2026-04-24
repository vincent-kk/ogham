import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { createLogger } from '../../../../lib/logger.js';
import {
  MAX_CACHE_DIRS_BEFORE_PRUNE,
  STALE_CACHE_TTL_MS,
} from '../../../../constants/infra-defaults.js';

const log = createLogger('cache');

/**
 * Prune stale cwdHash directories.
 *
 * Removes cwdHash directories where ALL files are older than 7 days,
 * keeping at most `maxDirs` directories regardless of age.
 * Called from setup hook (SessionStart) to limit cache growth.
 */
export function pruneStaleCacheDirs(): void {
  try {
    const configDir =
      process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude');
    const pluginDir = join(configDir, 'plugins', 'filid');
    if (!existsSync(pluginDir)) return;

    const dirs = readdirSync(pluginDir);
    if (dirs.length <= MAX_CACHE_DIRS_BEFORE_PRUNE) return;

    const now = Date.now();

    const staleDirs: string[] = [];
    for (const d of dirs) {
      const dirPath = join(pluginDir, d);
      try {
        const stat = statSync(dirPath);
        if (!stat.isDirectory()) continue;

        const files = readdirSync(dirPath);
        if (files.length === 0) {
          staleDirs.push(dirPath);
          continue;
        }
        const allStale = files.every((f) => {
          try {
            return now - statSync(join(dirPath, f)).mtimeMs > STALE_CACHE_TTL_MS;
          } catch (e) {
            log.debug(`pruneStaleCacheDirs: statSync failed for ${f}:`, e);
            return true;
          }
        });
        if (allStale) staleDirs.push(dirPath);
      } catch (e) {
        log.debug(`pruneStaleCacheDirs: failed to inspect ${d}:`, e);
      }
    }

    log.debug(
      `pruneStaleCacheDirs: ${staleDirs.length}/${dirs.length} stale dirs to remove`,
    );

    for (const dirPath of staleDirs) {
      try {
        rmSync(dirPath, { recursive: true, force: true });
        log.debug(`pruneStaleCacheDirs: removed ${dirPath}`);
      } catch (e) {
        log.debug(`pruneStaleCacheDirs: failed to remove ${dirPath}:`, e);
      }
    }
  } catch (e) {
    log.debug('pruneStaleCacheDirs: top-level error:', e);
  }
}
