import { createHash } from 'node:crypto';

import { portableResolve } from '@ogham/cross-platform/paths';

/**
 * Project key for a workspace. The path is canonicalised through the portable
 * resolver first — never native `path.resolve` — so a raw cwd and its resolved
 * form hash to one cache directory whatever spelling a call site passed and
 * whatever OS the server runs on. Boot-sweep resolves through the same portable
 * path, so writer and sweeper always agree; a host-dependent resolve made them
 * diverge on Windows and left expired sessions unswept.
 */
export function cwdHash(cwd: string): string {
  return createHash('sha256')
    .update(portableResolve(cwd))
    .digest('hex')
    .slice(0, 16);
}
