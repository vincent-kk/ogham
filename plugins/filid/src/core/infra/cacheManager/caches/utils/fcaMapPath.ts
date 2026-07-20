import { join } from 'node:path';

import { CACHE_PREFIX, SUBSCOPE_INFIX } from '../constants/cacheFiles.js';

import { getCacheDir } from './getCacheDir.js';
import { sessionIdHash } from './sessionIdHash.js';

/**
 * Cache scope of a hook event. Subagent tool calls share the parent
 * session_id but carry their own transcript file — `sub` holds that
 * transcript basename so subagent visits never pollute the main session's
 * delivery state. Absent `sub` means the main session (also the graceful
 * fallback when the host does not distinguish transcripts).
 */
export interface VisitScope {
  sessionId: string;
  sub?: string;
}

/**
 * Fractal-map file path for a scope. Sub-scope files share the session hash
 * prefix so session-wide sweeps (per-turn reset, prune, epoch reset) can
 * remove them with a single `fmap-{hash}` prefix match.
 */
export function fcaMapPath(cwd: string, scope: VisitScope): string {
  const hash = sessionIdHash(scope.sessionId);
  const name = scope.sub
    ? `${CACHE_PREFIX.FMAP}${hash}${SUBSCOPE_INFIX}${sessionIdHash(scope.sub)}.json`
    : `${CACHE_PREFIX.FMAP}${hash}.json`;
  return join(getCacheDir(cwd), name);
}
