import { logDirState } from './logDirState.js';

/** Reset logger state (for testing). */
export function resetLogger(): void {
  logDirState.value = undefined;
}
