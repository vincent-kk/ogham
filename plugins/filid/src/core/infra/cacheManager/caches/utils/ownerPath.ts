import { join } from 'node:path';

/** Ownership-token file inside the lock dir; distinguishes lock generations. */
export function ownerPath(lockPath: string): string {
  return join(lockPath, 'owner');
}
