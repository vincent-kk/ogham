import { logDirState } from './log-dir-state.js';

/** Reset logger state (for testing). */
export function resetLogger(): void {
  logDirState.value = undefined;
}
