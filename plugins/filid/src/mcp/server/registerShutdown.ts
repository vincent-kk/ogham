import { registerShutdownFinalizer } from '@ogham/session-finalizer';

import { cleanupOwnSessionCache } from './cleanupOwnSessionCache.js';

/**
 * Register the shutdown cleanup once (exit + SIGINT + SIGTERM) via the shared
 * session-finalizer runtime. Type C (synchronous cleanup only) — no detached
 * finalizer: filid has no heavy async session-end work, so `bootSweep` (boot-time
 * throttled prune) is the guaranteed fallback for anything the sync path misses.
 */
export function registerShutdown(): void {
  registerShutdownFinalizer({
    ctx: process.cwd(),
    onShutdown: cleanupOwnSessionCache,
  });
}
