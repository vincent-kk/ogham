/**
 * SessionStart hook handler for imbas.
 *
 * Performs initialization on every session start:
 *   1. Ensure the cache directory exists
 *   2. Emit session context for Claude Code
 */
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { createLogger, setLogDir } from '../../lib/logger.js';
import type { HookOutput, SessionStartInput } from '../../types/hooks.js';

const log = createLogger('setup');

/**
 * Derive imbas cache directory path.
 * Uses CLAUDE_CONFIG_DIR or ~/.claude as base.
 */
function getCacheDir(cwd: string): string {
  const configDir = process.env['CLAUDE_CONFIG_DIR'] || join(process.env['HOME'] || '', '.claude');
  // Hash-free simple path: use plugin name + cwd basename
  const base = cwd.split('/').pop() || 'default';
  return join(configDir, 'plugins', 'imbas', base);
}

export function processSetup(input: SessionStartInput): HookOutput {
  try {
    const { cwd } = input;

    // Phase 1: Init — ensure cache directory + enable file logging
    const cacheDir = getCacheDir(cwd);
    setLogDir(cacheDir);
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true });
    }

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
