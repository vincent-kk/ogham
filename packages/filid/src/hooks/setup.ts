/**
 * SessionStart hook handler for filid.
 *
 * Performs three tasks on every session start:
 *   1. Init  — ensure the cache directory exists, detect FCA project
 *   2. Auto-detect — if no .filid marker, scan for INTENT.md and create .filid/
 *   3. Maintenance — prune expired session cache files
 *
 * Note: run.cjs spawns this via spawnSync with stdio:'inherit',
 * so stdin is inherited from the parent (Claude Code), which
 * delivers EOF when the hook input is fully written.
 */
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { getCacheDir, pruneOldSessions } from '../core/cache-manager.js';
import type { HookOutput, SessionStartInput } from '../types/hooks.js';

import { isFcaProject } from './shared.js';

/** Directories to skip during INTENT.md scan */
const SCAN_SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  '.omc',
  '.claude',
]);

/**
 * Shallow BFS scan for INTENT.md in the project tree.
 * Returns true on first match, false if none found within maxDepth.
 */
function hasIntentMdInTree(rootDir: string, maxDepth: number = 4): boolean {
  const queue: Array<{ dir: string; depth: number }> = [
    { dir: rootDir, depth: 0 },
  ];

  while (queue.length > 0) {
    const { dir, depth } = queue.shift()!;
    if (depth > maxDepth) continue;

    if (existsSync(join(dir, 'INTENT.md'))) return true;

    if (depth === maxDepth) continue;

    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (SCAN_SKIP_DIRS.has(entry.name)) continue;
        if (entry.name.startsWith('.')) continue;
        queue.push({ dir: join(dir, entry.name), depth: depth + 1 });
      }
    } catch {
      // Permission denied or other FS error — skip silently
    }
  }

  return false;
}

export function processSetup(input: SessionStartInput): HookOutput {
  try {
    const { cwd } = input;

    // Phase 1: Init — ensure cache directory
    const cacheDir = getCacheDir(cwd);
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true });
    }

    let isFca = isFcaProject(cwd);

    // Phase 2: Auto-detect — scan for INTENT.md and create .filid/ marker
    try {
      if (!isFca && hasIntentMdInTree(cwd)) {
        mkdirSync(join(cwd, '.filid'), { recursive: true });
        isFca = true;

        if (process.env['FILID_DEBUG'] === '1') {
          console.error(
            `[filid:setup] Auto-detected FCA project, created .filid/ in ${cwd}`,
          );
        }
      }
    } catch (e) {
      if (process.env['FILID_DEBUG'] === '1') {
        console.error('[filid:setup] Auto-detect failed:', e);
      }
    }

    if (process.env['FILID_DEBUG'] === '1') {
      console.error(`[filid:setup] cwd=${cwd} fca=${isFca} cache=${cacheDir}`);
    }

    // Phase 3: Maintenance — prune old session files
    pruneOldSessions(cwd);

    // Only inject context for FCA projects to minimize token usage
    if (isFca) {
      return {
        continue: true,
        hookSpecificOutput: {
          hookEventName: 'SessionStart',
          additionalContext: `[filid] Session initialized. FCA project: yes. Cache: ${cacheDir}.`,
        },
      };
    }

    return { continue: true };
  } catch (e) {
    if (process.env['FILID_DEBUG'] === '1') {
      console.error('[filid:setup] Error:', e);
    }
    return { continue: true };
  }
}
