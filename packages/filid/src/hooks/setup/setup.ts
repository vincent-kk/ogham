/**
 * SessionStart hook handler for filid.
 *
 * Performs three tasks on every session start:
 *   1. Init  — ensure the cache directory exists, detect FCA project
 *   2. Auto-detect — if no .filid marker, scan for INTENT.md and create .filid/
 *   3. Maintenance — prune expired session cache files
 *
 * The hook intentionally does NOT touch `.claude/rules/` or
 * `.filid/config.json`. Rule doc deployment and config creation are handled
 * exclusively by the `/filid:filid-setup` skill so every change to
 * `.claude/rules/` is the result of an explicit user action.
 *
 * Note: run.cjs spawns this via spawnSync with stdio:'inherit',
 * so stdin is inherited from the parent (Claude Code), which
 * delivers EOF when the hook input is fully written.
 */
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  getCacheDir,
  pruneOldSessions,
  pruneStaleCacheDirs,
} from '../../core/infra/cache-manager/cache-manager.js';
import { createLogger, setLogDir } from '../../lib/logger.js';
import type { HookOutput, SessionStartInput } from '../../types/hooks.js';
import { isFcaProject } from '../shared/shared.js';

import { hasIntentMdInTree } from './utils/hasIntentMdInTree.js';

const log = createLogger('setup');

export function processSetup(input: SessionStartInput): HookOutput {
  try {
    const { cwd } = input;

    // Phase 1: Init — ensure cache directory + enable file logging
    const cacheDir = getCacheDir(cwd);
    setLogDir(cacheDir);
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true });
    }

    let isFca = isFcaProject(cwd);

    // Phase 2: Auto-detect — scan for INTENT.md and create .filid/ marker
    try {
      if (!isFca && hasIntentMdInTree(cwd)) {
        mkdirSync(join(cwd, '.filid'), { recursive: true });
        isFca = true;

        log.debug(`Auto-detected FCA project, created .filid/ in ${cwd}`);
      }
    } catch (e) {
      log.debug('Auto-detect failed:', e);
    }

    log.debug(`cwd=${cwd} fca=${isFca} cache=${cacheDir}`);

    // Phase 3: Maintenance — prune old session files + stale cache dirs
    // TODO: Add daily throttle to avoid O(projects * files) scan on every session start
    pruneOldSessions(cwd);
    pruneStaleCacheDirs();

    // Only inject context for FCA projects to minimize token usage.
    // Rule doc deployment is intentionally skipped here — the filid-setup
    // skill is the single source of writes to `.claude/rules/`.
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
    log.error('Error:', e);
    return { continue: true };
  }
}
