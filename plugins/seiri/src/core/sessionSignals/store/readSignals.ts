import { readFileSync } from 'node:fs';

import type { SessionSignals } from '../../../types/signals.js';
import { resolveSignalsPath } from '../utils/resolveSignalsPath.js';

/**
 * Read this session's counters. Never throws.
 *
 * A file belonging to another session is treated as absent rather than
 * merged: the next write replaces it, which is how leftovers from an
 * earlier session get cleaned up without a sweep of its own.
 *
 * Damage is treated the same way. These are counters for a suggestion —
 * losing them costs one delayed hint, while failing here would surface as
 * a hook error on an ordinary shell command.
 */
export function readSignals(
  projectRoot: string,
  sessionId: string,
): SessionSignals {
  const empty: SessionSignals = { sessionId, counts: {}, announced: [] };

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(resolveSignalsPath(projectRoot), 'utf8'));
  } catch {
    return empty;
  }

  if (typeof parsed !== 'object' || parsed === null) return empty;

  const stored = parsed as Partial<SessionSignals>;
  if (stored.sessionId !== sessionId) return empty;

  return {
    sessionId,
    counts:
      typeof stored.counts === 'object' && stored.counts !== null
        ? stored.counts
        : {},
    announced: Array.isArray(stored.announced) ? stored.announced : [],
  };
}
