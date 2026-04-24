/**
 * @file logger.ts
 * @description Facade — re-exports the 4 public logger entry points plus
 * the Logger interface. Each top-level function now lives in its own file
 * (create-logger, set-log-dir, get-log-dir, reset-logger) with shared
 * mutable state isolated in log-dir-state.ts.
 */
export { createLogger } from './create-logger.js';
export { getLogDir } from './get-log-dir.js';
export { resetLogger } from './reset-logger.js';
export { setLogDir } from './set-log-dir.js';
export type { Logger } from './logger-types.js';
