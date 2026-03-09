/**
 * SessionStart hook handler for filid.
 *
 * Performs two tasks on every session start:
 *   1. Init  — ensure the cache directory exists, detect FCA project
 *   2. Maintenance — prune expired session cache files
 *
 * Note: run.cjs spawns this via spawnSync with stdio:'inherit',
 * so stdin is inherited from the parent (Claude Code), which
 * delivers EOF when the hook input is fully written.
 */
import { existsSync, mkdirSync } from 'node:fs';

import { getCacheDir, pruneOldSessions } from '../core/cache-manager.js';
import type { HookOutput, SessionStartInput } from '../types/hooks.js';

import { isFcaProject } from './shared.js';

export function processSetup(input: SessionStartInput): HookOutput {
  try {
    const { cwd } = input;

    // Phase 1: Init — ensure cache directory
    const cacheDir = getCacheDir(cwd);
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true });
    }

    const isFca = isFcaProject(cwd);

    if (process.env['FILID_DEBUG'] === '1') {
      console.error(`[filid:setup] cwd=${cwd} fca=${isFca} cache=${cacheDir}`);
    }

    // Phase 2: Maintenance — prune old session files
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
