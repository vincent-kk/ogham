/**
 * SessionStart hook handler for imbas.
 *
 * Performs initialization on every session start:
 *   1. Ensure the cache directory exists
 *   2. Emit session context for Claude Code
 */
import { existsSync, mkdirSync } from 'node:fs';
import { basename, join } from 'node:path';

import { pluginCache } from '@ogham/cross-platform/paths';

import { createLogger, setLogDir } from '../../lib/logger.js';
import type { HookOutput, SessionStartInput } from '../../types/hooks.js';

const log = createLogger('setup');

/**
 * Derive imbas cache directory path under the host-aware plugin state root
 * (`~/.claude` on Claude, `~/.codex` on Codex — `pluginCache` reads the host
 * signal, so hook-written state no longer leaks to `~/.claude` under Codex).
 */
function getCacheDir(cwd: string): string {
  // Hash-free simple path: plugin state root + cwd basename
  const base = basename(cwd) || 'default';
  return join(pluginCache('imbas'), base);
}

export function processSetup(input: SessionStartInput): HookOutput {
  try {
    const { cwd } = input;

    // Phase 1: Init — ensure cache directory + enable file logging
    const cacheDir = getCacheDir(cwd);
    setLogDir(cacheDir);
    if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });

    log.debug(`cwd=${cwd} cache=${cacheDir}`);

    return {
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: `[imbas] Session initialized. Cache: ${cacheDir}.`,
      },
    };
  } catch (e) {
    log.error('Error:', e);
    return { continue: true };
  }
}
