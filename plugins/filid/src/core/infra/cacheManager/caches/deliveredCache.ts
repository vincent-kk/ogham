import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getCacheDir } from './getCacheDir.js';
import { sessionIdHash } from './sessionIdHash.js';

/** Path of the session-epoch delivery record (main scope only). */
export function deliveredPath(cwd: string, sessionId: string): string {
  return join(getCacheDir(cwd), `delivered-${sessionIdHash(sessionId)}.json`);
}

/**
 * Read the session-epoch delivery record: ownerKey → turn-stamp of the last
 * INTENT delivery. Advisory outside `commitVisit`; the locked transaction is
 * the write authority.
 */
export function readDelivered(
  cwd: string,
  sessionId: string,
): Record<string, number> {
  try {
    const parsed: unknown = JSON.parse(
      readFileSync(deliveredPath(cwd, sessionId), 'utf-8'),
    );
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
      return {};
    return parsed as Record<string, number>;
  } catch {
    return {};
  }
}
