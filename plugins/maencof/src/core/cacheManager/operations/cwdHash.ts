/**
 * @file cwdHash.ts
 * @description Derive the 12-hex cwd hash used to scope the plugin cache directory.
 */
import { createHash } from 'node:crypto';

export function cwdHash(cwd: string): string {
  return createHash('sha256').update(cwd).digest('hex').slice(0, 12);
}
