/**
 * @file cacheManager.ts
 * @description File-based session + turn cache for context injection.
 * Follows filid's cache-manager pattern: ~/.claude/plugins/maencof/{cwdHash}/
 */
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
import { join } from 'node:path';

import { pluginCache } from '@ogham/cross-platform/paths';

import { CACHE_TTL_MS, MAX_PINNED_NODES } from '../../constants/performance.js';

// Cache directory layout:
//   {cwdHash}/session-context-{hash}   — session inject marker (24h TTL)
//   {cwdHash}/prompt-context-{hash}    — per-session context text
//   {cwdHash}/recap-emitted-{hash}     — Stop recap once-per-session marker
//   {cwdHash}/turn-context             — session-scoped turn context (removed at session end)
//   {cwdHash}/pinned-nodes.json        — vault-scoped LLM-pinned node IDs

export interface PinnedNode {
  id: string;
  title: string;
  layer: number;
  pinnedAt: string;
}

export function cwdHash(cwd: string): string {
  return createHash('sha256').update(cwd).digest('hex').slice(0, 12);
}

export function sessionIdHash(sessionId: string): string {
  return createHash('sha256').update(sessionId).digest('hex').slice(0, 12);
}

export function getCacheDir(cwd: string): string {
  return join(pluginCache('maencof'), cwdHash(cwd));
}

export function isFirstInSession(sessionId: string, cwd: string): boolean {
  const marker = join(
    getCacheDir(cwd),
    `session-context-${sessionIdHash(sessionId)}`,
  );
  try {
    return !existsSync(marker);
  } catch {
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
  } catch {
    // silently ignore marker write failures
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
  } catch {
    // silently ignore cache write failures
  }
}

export function readPromptContext(
  cwd: string,
  sessionId: string,
): string | null {
  const contextFile = join(
    getCacheDir(cwd),
    `prompt-context-${sessionIdHash(sessionId)}`,
  );
  try {
    if (!existsSync(contextFile)) return null;
    return readFileSync(contextFile, 'utf-8');
  } catch {
    return null;
  }
}

export function hasPromptContext(sessionId: string, cwd: string): boolean {
  const contextFile = join(
    getCacheDir(cwd),
    `prompt-context-${sessionIdHash(sessionId)}`,
  );
  try {
    return existsSync(contextFile);
  } catch {
    return false;
  }
}

export function hasRecapMarker(sessionId: string, cwd: string): boolean {
  const marker = join(
    getCacheDir(cwd),
    `recap-emitted-${sessionIdHash(sessionId)}`,
  );
  try {
    return existsSync(marker);
  } catch {
    return false;
  }
}

export function markRecapEmitted(sessionId: string, cwd: string): void {
  const cacheDir = getCacheDir(cwd);
  const marker = join(cacheDir, `recap-emitted-${sessionIdHash(sessionId)}`);
  try {
    if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
    writeFileSync(marker, '', 'utf-8');
  } catch {
    // silently ignore marker write failures
  }
}

export function writeTurnContext(cwd: string, context: string): void {
  const cacheDir = getCacheDir(cwd);
  const turnFile = join(cacheDir, 'turn-context');
  try {
    if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
    writeFileSync(turnFile, context, 'utf-8');
  } catch {
    // silently ignore
  }
}

export function readTurnContext(cwd: string): string | null {
  const turnFile = join(getCacheDir(cwd), 'turn-context');
  try {
    if (!existsSync(turnFile)) return null;
    return readFileSync(turnFile, 'utf-8');
  } catch {
    return null;
  }
}

export function readPinnedNodes(cwd: string): PinnedNode[] {
  const pinnedFile = join(getCacheDir(cwd), 'pinned-nodes.json');
  try {
    if (!existsSync(pinnedFile)) return [];
    const raw = readFileSync(pinnedFile, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as PinnedNode[]) : [];
  } catch {
    return [];
  }
}

export function writePinnedNodes(cwd: string, nodes: PinnedNode[]): void {
  const cacheDir = getCacheDir(cwd);
  const pinnedFile = join(cacheDir, 'pinned-nodes.json');
  try {
    if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
    // Enforce max limit — evict oldest by pinnedAt
    let toWrite = nodes;
    if (toWrite.length > MAX_PINNED_NODES)
      toWrite = [...toWrite]
        .sort(
          (a, b) =>
            new Date(b.pinnedAt).getTime() - new Date(a.pinnedAt).getTime(),
        )
        .slice(0, MAX_PINNED_NODES);

    writeFileSync(pinnedFile, JSON.stringify(toWrite), 'utf-8');
  } catch {
    // silently ignore
  }
}

export function pruneOldSessions(cwd: string): void {
  try {
    const dir = getCacheDir(cwd);
    const files = readdirSync(dir);
    const sessionFiles = files.filter((f) => f.startsWith('session-context-'));
    if (sessionFiles.length <= 10) return;
    const now = Date.now();
    for (const file of sessionFiles) {
      const fp = join(dir, file);
      try {
        if (now - statSync(fp).mtimeMs > CACHE_TTL_MS) {
          unlinkSync(fp);
          // also remove paired prompt-context file
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
  const sessionScopedFiles = [
    join(cacheDir, `session-context-${hash}`),
    join(cacheDir, `prompt-context-${hash}`),
    join(cacheDir, `recap-emitted-${hash}`),
  ];
  for (const file of sessionScopedFiles)
    try {
      if (existsSync(file)) unlinkSync(file);
    } catch {
      // silently ignore
    }

  // NOTE: turn-context is session-scoped — removed via removeTurnContext on session end.
  // pinned-nodes.json is vault-scoped, NOT removed here.
}

/**
 * Remove the turn-context cache file for the given vault/cwd.
 *
 * turn-context는 session-scope이므로 session 종료 시 폐기한다. 디렉터리 자체는 유지.
 */
export function removeTurnContext(cwd: string): void {
  const turnFile = join(getCacheDir(cwd), 'turn-context');
  try {
    if (existsSync(turnFile)) unlinkSync(turnFile);
  } catch {
    // silently ignore
  }
}
