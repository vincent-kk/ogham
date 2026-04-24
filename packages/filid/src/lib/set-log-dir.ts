import { logDirState } from './log-dir-state.js';

/**
 * Set the directory for file-based debug logging.
 * Call once per process with the plugin cache directory.
 * File logging is only active when FILID_DEBUG=1.
 */
export function setLogDir(dir: string): void {
  logDirState.value = dir;
}
