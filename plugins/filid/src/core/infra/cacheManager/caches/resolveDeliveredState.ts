import type { DeliveredState, VisitArgs } from './commitVisit.js';
import { readDelivered } from './deliveredCache.js';
import type { VisitScope } from './fmapPath.js';
import type { FractalMap } from './readFractalMap.js';
import { readTurn } from './turnCounter.js';

/**
 * Resolve the delivery 3-state for the owner INTENT. Sub-scope stamping
 * mutates `map.delivered` directly; main-scope stamping is returned as
 * `mainDelivered` for the caller to write under the fmap lock.
 */
export function resolveDeliveredState(
  cwd: string,
  scope: VisitScope,
  args: Pick<VisitArgs, 'ownerKey' | 'ttlTurns'>,
  map: FractalMap,
): {
  deliveredState: DeliveredState;
  mainDelivered: Record<string, number> | null;
} {
  const ownerKey = args.ownerKey;
  if (ownerKey === null)
    return { deliveredState: 'fresh', mainDelivered: null };

  if (scope.sub) {
    const record = map.delivered ?? {};
    const deliveredState: DeliveredState = record[ownerKey] ? 'fresh' : 'none';
    if (deliveredState !== 'fresh') {
      record[ownerKey] = true;
      map.delivered = record;
    }
    return { deliveredState, mainDelivered: null };
  }

  const delivered = readDelivered(cwd, scope.sessionId);
  const stamp = delivered[ownerKey];
  const turn = readTurn(cwd, scope.sessionId);
  const deliveredState: DeliveredState =
    typeof stamp !== 'number'
      ? 'none'
      : turn - stamp < args.ttlTurns
        ? 'fresh'
        : 'stale';
  let mainDelivered: Record<string, number> | null = null;
  if (deliveredState !== 'fresh') {
    delivered[ownerKey] = turn;
    mainDelivered = delivered;
  }
  return { deliveredState, mainDelivered };
}
