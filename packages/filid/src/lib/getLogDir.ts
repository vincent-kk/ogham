import { logDirState } from './logDirState.js';

/** Get current log directory (for testing). */
export function getLogDir(): string | undefined {
  return logDirState.value;
}
