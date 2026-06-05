/**
 * @file logger.ts
 * @description Facade — re-exports the 4 public logger entry points plus
 * the Logger interface. Each top-level function now lives in its own file
 * (create-logger, set-log-dir, get-log-dir, reset-logger) with shared
 * mutable state isolated in logDirState.ts.
 */
export { createLogger } from './createLogger.js';
export { getLogDir } from './getLogDir.js';
export { resetLogger } from './resetLogger.js';
export { setLogDir } from './setLogDir.js';
export type { Logger } from './loggerTypes.js';
