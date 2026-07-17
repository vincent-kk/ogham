import { mkdirSync, renameSync, writeFileSync } from 'node:fs';

import { deliveredPath, readDelivered } from './deliveredCache.js';
import { acquireLock, releaseLock } from './fmapLock.js';
import type { VisitScope } from './fmapPath.js';
import { fmapPath } from './fmapPath.js';
import { getCacheDir } from './getCacheDir.js';
import { hasGuideInjected, markGuideInjected } from './guideCache.js';
import { readFractalMap } from './readFractalMap.js';
import { readTurn } from './turnCounter.js';

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

function writeAtomic(filePath: string, data: string): void {
  const tmpPath = `${filePath}.${process.pid}.tmp`;
  writeFileSync(tmpPath, data);
  renameSync(tmpPath, filePath);
}

/** Canonical visit set: sorted unique boundary-stripped dirs (marker-free). */
function canonicalOf(reads: string[]): string {
  const dirs = reads.map((key) => {
    const tab = key.indexOf('\t');
    return tab === -1 ? key : key.slice(tab + 1);
  });
  return [...new Set(dirs)].sort().join('\n');
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
  const filePath = fmapPath(cwd, scope);
  const lockPath = `${filePath}.lock`;
  const locked = acquireLock(lockPath);
  try {
    const map = readFractalMap(cwd, scope);

    let deliveredState: DeliveredState = 'fresh';
    let mainDelivered: Record<string, number> | null = null;
    if (args.ownerKey !== null)
      if (scope.sub) {
        const record = map.delivered ?? {};
        deliveredState = record[args.ownerKey] ? 'fresh' : 'none';
        if (deliveredState !== 'fresh') {
          record[args.ownerKey] = true;
          map.delivered = record;
        }
      } else {
        const delivered = readDelivered(cwd, scope.sessionId);
        const stamp = delivered[args.ownerKey];
        const turn = readTurn(cwd, scope.sessionId);
        deliveredState =
          typeof stamp !== 'number'
            ? 'none'
            : turn - stamp < args.ttlTurns
              ? 'fresh'
              : 'stale';
        if (deliveredState !== 'fresh') {
          delivered[args.ownerKey] = turn;
          mainDelivered = delivered;
        }
      }

    let guideNeeded = false;
    if (deliveredState !== 'fresh' && args.silentDelivery !== true)
      if (scope.sub) {
        if (!map.guideShown) {
          guideNeeded = true;
          map.guideShown = true;
        }
      } else if (!hasGuideInjected(scope.sessionId, cwd)) {
        guideNeeded = true;
        markGuideInjected(scope.sessionId, cwd);
      }

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
    releaseLock(lockPath, locked);
  }
}
