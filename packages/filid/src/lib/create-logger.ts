import { isDebug } from './is-debug.js';
import type { Logger } from './logger-types.js';
import { writeToFile } from './write-to-file.js';

/**
 * Create a component-tagged logger.
 *
 * `debug()` and `error()` remain gated by `FILID_DEBUG=1` to preserve the
 * existing silent-degradation behavior. `warn()` is always emitted — config
 * sanitisation relies on warnings reaching operators via stderr so they
 * mirror the MCP `configWarnings` response field (AC-Obs).
 */
export function createLogger(component: string): Logger {
  const tag = `[filid:${component}]`;

  return {
    debug(msg: string, ...args: unknown[]): void {
      if (!isDebug()) return;
      try {
        console.error(tag, msg, ...args);
      } catch {
        // never throw
      }
      writeToFile('DEBUG', tag, msg, args);
    },
    warn(msg: string, ...args: unknown[]): void {
      try {
        console.error(tag, msg, ...args);
      } catch {
        // never throw
      }
      writeToFile('WARN', tag, msg, args);
    },
    error(msg: string, ...args: unknown[]): void {
      if (!isDebug()) return;
      try {
        console.error(tag, msg, ...args);
      } catch {
        // never throw
      }
      writeToFile('ERROR', tag, msg, args);
    },
  };
}
