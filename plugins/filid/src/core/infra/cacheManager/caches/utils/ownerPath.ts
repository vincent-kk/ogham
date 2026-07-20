import { join } from 'node:path';

import { LOCK_OWNER_FILE } from '../constants/cacheFiles.js';

/** Ownership-token file inside the lock dir; distinguishes lock generations. */
export function ownerPath(lockPath: string): string {
  return join(lockPath, LOCK_OWNER_FILE);
}
