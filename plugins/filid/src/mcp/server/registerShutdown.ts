import { tryProjectRoot } from '@ogham/cross-platform/host-paths';
import { registerShutdownFinalizer } from '@ogham/session-finalizer';

import { cleanupOwnSessionCache } from './cleanupOwnSessionCache.js';

/**
 * Register the shutdown cleanup once (exit + SIGINT + SIGTERM) via the shared
 * session-finalizer runtime. Type C (synchronous cleanup only) — no detached
 * finalizer: filid has no heavy async session-end work, so `bootSweep` (boot-time
 * throttled prune) is the guaranteed fallback for anything the sync path misses.
 *
 * `ctx` is inert here — with no `guard` and no detached child, nothing reads it,
 * and `cleanupOwnSessionCache` resolves the project root itself at shutdown, by
 * which time a tool call may have supplied one.
 */
export function registerShutdown(): void {
  registerShutdownFinalizer({
    ctx: tryProjectRoot() ?? '',
    onShutdown: cleanupOwnSessionCache,
  });
}
