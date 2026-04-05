import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { createLogger } from '../../../lib/logger.js';
import {
  SESSION_TTL_MS,
  STALE_CACHE_TTL_MS,
  MAX_SESSION_FILES_BEFORE_PRUNE,
  MAX_CACHE_DIRS_BEFORE_PRUNE,
} from '../../../constants/infra-defaults.js';

const log = createLogger('cache');

/** In-memory fractal map per session */
export interface FractalMap {
  reads: string[]; // accessed directories (order preserved, no duplicates)
  intents: string[]; // directories with INTENT.md (dedup dual-use)
  details: string[]; // directories with DETAIL.md
}

// Cache directory layout:
//   {cwdHash}/session-context-{hash}   — Layer 2: session inject marker (24h TTL)
//   {cwdHash}/prompt-context-{hash}    — Layer 2: per-session FCA rules text cache
//   {cwdHash}/run-{skillName}.hash     — Layer 4: skill run hash for incremental mode

export function cwdHash(cwd: string): string {
  return createHash('sha256').update(cwd).digest('hex').slice(0, 16);
}

export function getCacheDir(cwd: string): string {
  const configDir = process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude');
  return join(configDir, 'plugins', 'filid', cwdHash(cwd));
}

export function readPromptContext(
  cwd: string,
  sessionId: string,
): string | null {
  const cacheDir = getCacheDir(cwd);
  const contextFile = join(
    cacheDir,
    `prompt-context-${sessionIdHash(sessionId)}`,
  );
  try {
    if (!existsSync(contextFile)) return null;
    return readFileSync(contextFile, 'utf-8');
  } catch (e) {
    log.debug('readPromptContext failed:', e);
    return null;
  }
}

export function writePromptContext(
  cwd: string,
  context: string,
  sessionId: string,
): void {
  const cacheDir = getCacheDir(cwd);
  const contextFile = join(
    cacheDir,
    `prompt-context-${sessionIdHash(sessionId)}`,
  );
  try {
    if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
    writeFileSync(contextFile, context, 'utf-8');
  } catch (e) {
    log.debug('writePromptContext failed:', e);
  }
}

export function hasPromptContext(sessionId: string, cwd: string): boolean {
  const contextFile = join(
    getCacheDir(cwd),
    `prompt-context-${sessionIdHash(sessionId)}`,
  );
  try {
    return existsSync(contextFile);
  } catch (e) {
    log.debug('hasPromptContext failed:', e);
    return false;
  }
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

        // Check if all files in this dir are older than TTL
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

export function saveRunHash(
  cwd: string,
  skillName: string,
  hash: string,
): void {
  const cacheDir = getCacheDir(cwd);
  const hashFile = join(cacheDir, `run-${skillName}.hash`);
  try {
    if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
    writeFileSync(hashFile, hash, 'utf-8');
  } catch (e) {
    log.debug('saveRunHash failed:', e);
  }
}

export function getLastRunHash(cwd: string, skillName: string): string | null {
  const cacheDir = getCacheDir(cwd);
  const hashFile = join(cacheDir, `run-${skillName}.hash`);
  try {
    return readFileSync(hashFile, 'utf-8').trim();
  } catch (e) {
    log.debug('getLastRunHash failed:', e);
    return null;
  }
}

/**
 * Read boundary cache for a directory.
 * Returns the cached boundary path or null if not cached.
 */
export function readBoundary(
  cwd: string,
  sessionId: string,
  dir: string,
): string | null {
  const cacheDir = getCacheDir(cwd);
  const hash = sessionIdHash(sessionId);
  const filePath = join(cacheDir, `boundary-${hash}`);
  try {
    const data = JSON.parse(readFileSync(filePath, 'utf-8'));
    return data[dir] ?? null;
  } catch (e) {
    log.debug('readBoundary failed:', e);
    return null;
  }
}

/**
 * Write boundary cache for a directory.
 */
/**
 * Write boundary cache for a directory.
 *
 * Note: read-modify-write is NOT atomic. This is acceptable because
 * Claude Code hooks execute sequentially per session — concurrent
 * writes to the same cache file do not occur in practice.
 */
export function writeBoundary(
  cwd: string,
  sessionId: string,
  dir: string,
  boundaryPath: string,
): void {
  const cacheDir = getCacheDir(cwd);
  mkdirSync(cacheDir, { recursive: true });
  const hash = sessionIdHash(sessionId);
  const filePath = join(cacheDir, `boundary-${hash}`);
  let data: Record<string, string> = {};
  try {
    data = JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    /* new file */
  }
  data[dir] = boundaryPath;
  writeFileSync(filePath, JSON.stringify(data));
}

/**
 * Read fractal map from cache.
 */
export function readFractalMap(cwd: string, sessionId: string): FractalMap {
  const cacheDir = getCacheDir(cwd);
  const hash = sessionIdHash(sessionId);
  const filePath = join(cacheDir, `fmap-${hash}.json`);
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return { reads: [], intents: [], details: [] };
  }
}

/**
 * Write fractal map to cache.
 */
export function writeFractalMap(
  cwd: string,
  sessionId: string,
  map: FractalMap,
): void {
  const cacheDir = getCacheDir(cwd);
  mkdirSync(cacheDir, { recursive: true });
  const hash = sessionIdHash(sessionId);
  const filePath = join(cacheDir, `fmap-${hash}.json`);
  writeFileSync(filePath, JSON.stringify(map));
}

/**
 * Remove fractal map cache for a session.
 * Called by UserPromptSubmit to reset per-turn state.
 */
export function removeFractalMap(cwd: string, sessionId: string): void {
  const cacheDir = getCacheDir(cwd);
  const hash = sessionIdHash(sessionId);
  const filePath = join(cacheDir, `fmap-${hash}.json`);
  try {
    unlinkSync(filePath);
  } catch {
    // silently ignore — file may not exist
  }
}

/**
 * Check if [filid:guide] has been injected in this session.
 */
export function hasGuideInjected(sessionId: string, cwd: string): boolean {
  const filePath = join(getCacheDir(cwd), `guide-${sessionIdHash(sessionId)}`);
  try {
    return existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * Mark [filid:guide] as injected for this session.
 */
export function markGuideInjected(sessionId: string, cwd: string): void {
  const cacheDir = getCacheDir(cwd);
  if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
  writeFileSync(
    join(cacheDir, `guide-${sessionIdHash(sessionId)}`),
    '',
    'utf-8',
  );
}
