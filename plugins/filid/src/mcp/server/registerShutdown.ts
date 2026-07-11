import { cleanupOwnSessionCache } from './cleanupOwnSessionCache.js';

let registered = false;

const SHUTDOWN_SIGNALS = ['SIGINT', 'SIGTERM'] as const;

/** Register the shutdown cleanup once (exit + SIGINT + SIGTERM). */
export function registerShutdown(): void {
  if (registered) return;
  registered = true;
  process.once('exit', cleanupOwnSessionCache);
  for (const signal of SHUTDOWN_SIGNALS)
    process.once(signal, () => {
      cleanupOwnSessionCache();
      process.exit(0);
    });
}
