import { readFileSync } from 'node:fs';

import { deliveredPath } from './utils/deliveredPath.js';

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
