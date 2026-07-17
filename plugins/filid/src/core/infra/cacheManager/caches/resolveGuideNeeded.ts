import type { DeliveredState } from './commitVisit.js';
import { hasGuideInjected, markGuideInjected } from './guideCache.js';
import type { FractalMap } from './readFractalMap.js';
import type { VisitScope } from './utils/fcaMapPath.js';

/**
 * Resolve whether GUIDE_BLOCK must be prepended — true exactly once per
 * scope, on the first non-fresh delivery. Sub-scope stamping mutates
 * `map.guideShown` directly; main-scope stamping calls `markGuideInjected`.
 */
export function resolveGuideNeeded(
  cwd: string,
  scope: VisitScope,
  deliveredState: DeliveredState,
  silentDelivery: boolean | undefined,
  map: FractalMap,
): boolean {
  if (deliveredState === 'fresh' || silentDelivery === true) return false;

  if (scope.sub) {
    if (map.guideShown) return false;
    map.guideShown = true;
    return true;
  }

  if (hasGuideInjected(scope.sessionId, cwd)) return false;
  markGuideInjected(scope.sessionId, cwd);
  return true;
}
