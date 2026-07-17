import { readFileSync } from 'node:fs';

import type { VisitScope } from './utils/fcaMapPath.js';
import { fcaMapPath } from './utils/fcaMapPath.js';

/**
 * Per-turn visit map for one scope.
 *
 * `reads` entries are `{boundaryAbsPath}\t{relDir}` composite keys — relDir
 * alone collides across monorepo packages. `lastMap` is the canonical form of
 * the last emitted [filid:map] (emission dedup, last-writer-wins).
 * `delivered`/`guideShown` exist only in subagent scopes, whose delivery
 * record lives and dies with the turn-scoped map file itself.
 */
export interface FractalMap {
  reads: string[];
  lastMap?: string;
  delivered?: Record<string, true>;
  guideShown?: boolean;
}

/** Read the scope's fractal map (advisory outside `commitVisit`). */
export function readFractalMap(cwd: string, scope: VisitScope): FractalMap {
  try {
    const parsed: unknown = JSON.parse(
      readFileSync(fcaMapPath(cwd, scope), 'utf-8'),
    );
    if (typeof parsed !== 'object' || parsed === null) return { reads: [] };
    const raw = parsed as Partial<FractalMap>;
    return { ...raw, reads: Array.isArray(raw.reads) ? raw.reads : [] };
  } catch {
    return { reads: [] };
  }
}
