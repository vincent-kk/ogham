import { mkdirSync } from 'node:fs';

import { acquireLock, releaseLock } from './fmapLock.js';
import { readFractalMap } from './readFractalMap.js';
import { resolveDeliveredState } from './resolveDeliveredState.js';
import { resolveGuideNeeded } from './resolveGuideNeeded.js';
import { canonicalOf } from './utils/canonicalOf.js';
import { deliveredPath } from './utils/deliveredPath.js';
import type { VisitScope } from './utils/fcaMapPath.js';
import { fcaMapPath } from './utils/fcaMapPath.js';
import { getCacheDir } from './utils/getCacheDir.js';
import { writeAtomic } from './utils/writeAtomic.js';

export type DeliveredState = 'none' | 'stale' | 'fresh';

export interface VisitArgs {
  /** Composite visit key recorded in reads (skipped on the gate-deny path). */
  readKey: string;
  /** Owner-fractal delivery key; null = no owner INTENT (nothing to deliver). */
  ownerKey: string | null;
  /** Main scope: fresh iff (currentTurn - stamp) < ttlTurns. Sub scope is binary. */
  ttlTurns: number;
  /**
   * When true and the owner is undelivered, the visit resolves as a gate deny:
   * delivery + guide are stamped (the deny reason carries them), but the read
   * is not recorded and lastMap does not advance — a blocked call is no visit.
   */
  gateEligible: boolean;
  /**
   * Delivery is stamped but nothing will be emitted (INTENT.md self-authoring:
   * the author has the rules in context by construction). Skips guide marking
   * so the session's one guide is not consumed silently.
   */
  silentDelivery?: boolean;
}

export interface VisitDecision {
  deliveredState: DeliveredState;
  /** True when the canonical visit set changed — the caller emits [filid:map]. */
  mapChanged: boolean;
  /** Post-merge reads, for rendering the map block. */
  reads: string[];
  /** True exactly once per scope, on the first delivery — prepend GUIDE_BLOCK. */
  guideNeeded: boolean;
}

/**
 * The visit transaction — single write authority for visit state. Inside the
 * fmap lock it re-reads on-disk state, resolves the delivery 3-state, stamps
 * delivery/guide, merges the read, and compare-and-sets the canonical map.
 * Advisory reads outside this function never decide an emission.
 *
 * On lock timeout it proceeds lockless (a hook degrades, never hangs); the
 * worst case is a duplicated emission, identical to the pre-lock behavior.
 */
export function commitVisit(
  cwd: string,
  scope: VisitScope,
  args: VisitArgs,
): VisitDecision {
  const cacheDir = getCacheDir(cwd);
  mkdirSync(cacheDir, { recursive: true });
  const filePath = fcaMapPath(cwd, scope);
  const lockPath = `${filePath}.lock`;
  const lockToken = acquireLock(lockPath);
  try {
    const map = readFractalMap(cwd, scope);

    const { deliveredState, mainDelivered } = resolveDeliveredState(
      cwd,
      scope,
      args,
      map,
    );

    const guideNeeded = resolveGuideNeeded(
      cwd,
      scope,
      deliveredState,
      args.silentDelivery,
      map,
    );

    const denyPath = args.gateEligible && deliveredState === 'none';
    let mapChanged = false;
    if (!denyPath) {
      if (!map.reads.includes(args.readKey)) map.reads.push(args.readKey);
      const canonical = canonicalOf(map.reads);
      if (canonical !== (map.lastMap ?? '')) {
        mapChanged = true;
        map.lastMap = canonical;
      }
    }

    writeAtomic(filePath, JSON.stringify(map));
    if (mainDelivered !== null)
      writeAtomic(
        deliveredPath(cwd, scope.sessionId),
        JSON.stringify(mainDelivered),
      );

    return { deliveredState, mapChanged, reads: map.reads, guideNeeded };
  } finally {
    releaseLock(lockPath, lockToken);
  }
}
