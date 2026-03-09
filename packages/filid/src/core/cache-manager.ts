import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/** In-memory fractal map per session */
export interface FractalMap {
  reads: string[];    // accessed directories (order preserved, no duplicates)
  intents: string[];  // directories with INTENT.md (dedup dual-use)
  details: string[];  // directories with DETAIL.md
}

// Cache directory layout:
//   {cwdHash}/session-context-{hash}   — Layer 2: session inject marker (24h TTL)
//   {cwdHash}/prompt-context-{hash}    — Layer 2: per-session FCA rules text cache
//   {cwdHash}/run-{skillName}.hash     — Layer 4: skill run hash for incremental mode

export function cwdHash(cwd: string): string {
  return createHash('sha256').update(cwd).digest('hex').slice(0, 12);
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
    if (process.env['FILID_DEBUG'] === '1') console.error('[filid:cache] readPromptContext failed:', e);
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
    if (process.env['FILID_DEBUG'] === '1') console.error('[filid:cache] writePromptContext failed:', e);
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
    if (process.env['FILID_DEBUG'] === '1') console.error('[filid:cache] hasPromptContext failed:', e);
    return false;
  }
}

export function sessionIdHash(sessionId: string): string {
  return createHash('sha256').update(sessionId).digest('hex').slice(0, 12);
}

export function isFirstInSession(sessionId: string, cwd: string): boolean {
  const marker = join(
    getCacheDir(cwd),
    `session-context-${sessionIdHash(sessionId)}`,
  );
  try {
    return !existsSync(marker);
  } catch (e) {
    if (process.env['FILID_DEBUG'] === '1') console.error('[filid:cache] isFirstInSession failed:', e);
    return true;
  }
}

export function pruneOldSessions(cwd: string): void {
  try {
    const dir = getCacheDir(cwd);
    const files = readdirSync(dir);
    const sessionFiles = files.filter((f) => f.startsWith('session-context-'));
    if (sessionFiles.length <= 10) return;
    const now = Date.now();
    const TTL_MS = 24 * 60 * 60 * 1000;
    for (const file of sessionFiles) {
      const fp = join(dir, file);
      try {
        if (now - statSync(fp).mtimeMs > TTL_MS) {
          unlinkSync(fp);
          // also remove the paired prompt-context file
          const hash = file.replace('session-context-', '');
          const contextFp = join(dir, `prompt-context-${hash}`);
          try {
            if (existsSync(contextFp)) unlinkSync(contextFp);
          } catch {
            // ignore
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

export function removeSessionFiles(sessionId: string, cwd: string): void {
  const cacheDir = getCacheDir(cwd);
  const hash = sessionIdHash(sessionId);
  const marker = join(cacheDir, `session-context-${hash}`);
  const contextFile = join(cacheDir, `prompt-context-${hash}`);
  const boundaryFile = join(cacheDir, `boundary-${hash}`);
  const fmapFile = join(cacheDir, `fmap-${hash}.json`);
  for (const file of [marker, contextFile, boundaryFile, fmapFile]) {
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
    if (process.env['FILID_DEBUG'] === '1') console.error('[filid:cache] markSessionInjected failed:', e);
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
    if (process.env['FILID_DEBUG'] === '1') console.error('[filid:cache] saveRunHash failed:', e);
  }
}

export function getLastRunHash(cwd: string, skillName: string): string | null {
  const cacheDir = getCacheDir(cwd);
  const hashFile = join(cacheDir, `run-${skillName}.hash`);
  try {
    return readFileSync(hashFile, 'utf-8').trim();
  } catch (e) {
    if (process.env['FILID_DEBUG'] === '1') console.error('[filid:cache] getLastRunHash failed:', e);
    return null;
  }
}

/**
 * Read boundary cache for a directory.
 * Returns the cached boundary path or null if not cached.
 */
export function readBoundary(cwd: string, sessionId: string, dir: string): string | null {
  const cacheDir = getCacheDir(cwd);
  const hash = sessionIdHash(sessionId);
  const filePath = join(cacheDir, `boundary-${hash}`);
  try {
    const data = JSON.parse(readFileSync(filePath, 'utf-8'));
    return data[dir] ?? null;
  } catch (e) {
    if (process.env['FILID_DEBUG'] === '1') console.error('[filid:cache] readBoundary failed:', e);
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
export function writeBoundary(cwd: string, sessionId: string, dir: string, boundaryPath: string): void {
  const cacheDir = getCacheDir(cwd);
  mkdirSync(cacheDir, { recursive: true });
  const hash = sessionIdHash(sessionId);
  const filePath = join(cacheDir, `boundary-${hash}`);
  let data: Record<string, string> = {};
  try {
    data = JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch { /* new file */ }
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
export function writeFractalMap(cwd: string, sessionId: string, map: FractalMap): void {
  const cacheDir = getCacheDir(cwd);
  mkdirSync(cacheDir, { recursive: true });
  const hash = sessionIdHash(sessionId);
  const filePath = join(cacheDir, `fmap-${hash}.json`);
  writeFileSync(filePath, JSON.stringify(map));
}
