import { logDirState } from './log-dir-state.js';

/** Get current log directory (for testing). */
export function getLogDir(): string | undefined {
  return logDirState.value;
}
