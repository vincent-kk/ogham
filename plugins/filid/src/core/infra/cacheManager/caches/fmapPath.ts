import { join } from 'node:path';

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
export function fmapPath(cwd: string, scope: VisitScope): string {
  const hash = sessionIdHash(scope.sessionId);
  const name = scope.sub
    ? `fmap-${hash}-sub-${sessionIdHash(scope.sub)}.json`
    : `fmap-${hash}.json`;
  return join(getCacheDir(cwd), name);
}
