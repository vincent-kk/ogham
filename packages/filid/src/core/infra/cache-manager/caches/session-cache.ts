import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { createLogger } from '../../../../lib/logger.js';
import {
  MAX_CACHE_DIRS_BEFORE_PRUNE,
  MAX_SESSION_FILES_BEFORE_PRUNE,
  SESSION_TTL_MS,
  STALE_CACHE_TTL_MS,
} from '../../../../constants/infra-defaults.js';

const log = createLogger('cache');

export function cwdHash(cwd: string): string {
  return createHash('sha256').update(cwd).digest('hex').slice(0, 16);
}

export function getCacheDir(cwd: string): string {
  const configDir = process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude');
  return join(configDir, 'plugins', 'filid', cwdHash(cwd));
}

export function sessionIdHash(sessionId: string): string {
  return createHash('sha256').update(sessionId).digest('hex').slice(0, 16);
}

export function isFirstInSession(sessionId: string, cwd: string): boolean {
  const marker = join(
    getCacheDir(cwd),
    `session-context-${sessionIdHash(sessionId)}`,
  );
  try {
    return !existsSync(marker);
  } catch (e) {
    log.debug('isFirstInSession failed:', e);
    return true;
  }
}

export function markSessionInjected(sessionId: string, cwd: string): void {
  const cacheDir = getCacheDir(cwd);
  const marker = join(cacheDir, `session-context-${sessionIdHash(sessionId)}`);
  try {
    if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
    writeFileSync(marker, '', 'utf-8');
    pruneOldSessions(cwd);
  } catch (e) {
    log.debug('markSessionInjected failed:', e);
  }
}

/**
 * Prune old session files.
 *
 * Intentional cross-concern coupling: this function knows the filename
 * conventions of prompt-context, guide, boundary, and fmap caches.
 * This is necessary because pruning a session must remove all paired
 * cache files atomically. Documented in DETAIL.md.
 */
export function pruneOldSessions(cwd: string): void {
  try {
    const dir = getCacheDir(cwd);
    const files = readdirSync(dir);
    const sessionFiles = files.filter((f) => f.startsWith('session-context-'));
    if (sessionFiles.length <= MAX_SESSION_FILES_BEFORE_PRUNE) return;
    const now = Date.now();
    for (const file of sessionFiles) {
      const fp = join(dir, file);
      try {
        if (now - statSync(fp).mtimeMs > SESSION_TTL_MS) {
          unlinkSync(fp);
          // also remove paired cache files (aligned with removeSessionFiles)
          const hash = file.replace('session-context-', '');
          const contextFp = join(dir, `prompt-context-${hash}`);
          const guideFp = join(dir, `guide-${hash}`);
          const boundaryFp = join(dir, `boundary-${hash}`);
          const fmapFp = join(dir, `fmap-${hash}.json`);
          for (const paired of [contextFp, guideFp, boundaryFp, fmapFp]) {
            try {
              if (existsSync(paired)) unlinkSync(paired);
            } catch {
              // ignore
            }
          }
        }
      } catch {
        // ignore individual file deletion failures
      }
    }
  } catch {
    // ignore directory read failures
  }
}

/**
 * Remove all session-related cache files.
 *
 * Intentional cross-concern coupling: this function knows the filename
 * conventions of prompt-context, guide, boundary, and fmap caches.
 * See DETAIL.md for rationale.
 */
export function removeSessionFiles(sessionId: string, cwd: string): void {
  const cacheDir = getCacheDir(cwd);
  const hash = sessionIdHash(sessionId);
  const marker = join(cacheDir, `session-context-${hash}`);
  const contextFile = join(cacheDir, `prompt-context-${hash}`);
  const boundaryFile = join(cacheDir, `boundary-${hash}`);
  const fmapFile = join(cacheDir, `fmap-${hash}.json`);
  const guideFile = join(cacheDir, `guide-${hash}`);
  for (const file of [marker, contextFile, boundaryFile, fmapFile, guideFile]) {
    try {
      unlinkSync(file);
    } catch {
      // silently ignore — file may not exist
    }
  }
}

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
