import { existsSync } from 'node:fs';

import { removeFileIfExistsSync } from '@ogham/cross-platform';

import { resolveRuntimePath } from '../utils/resolveRuntimePath.js';

/**
 * Drop the session valve so the committed baseline applies again.
 *
 * Returns whether a valve was actually there, so a caller can say
 * "restored" or "there was nothing to restore" rather than reporting
 * success either way.
 */
export function clearRuntime(projectRoot: string): boolean {
  const path = resolveRuntimePath(projectRoot);
  if (!existsSync(path)) return false;
  removeFileIfExistsSync(path);
  return true;
}
