import { HOOK_GUIDE_BLOCK } from '../../../../../constants/hookContext.js';
import type { VisitDecision } from '../../../../../core/infra/cacheManager/caches/fractalMapCache.js';
import type { HookOutput } from '../../../../../types/hooks.js';

import { buildGateDeny } from './buildGateDeny.js';
import { buildMapBlock } from './buildMapBlock.js';

/**
 * Assemble the post-commitVisit output: a gate deny for an undelivered
 * mutation, or the pointer ctx / guide / map blocks for the resolved
 * delivery state.
 * @param decision Result of the locked commitVisit transaction.
 * @param gateEligible True when an undelivered owner must deny this mutation.
 * @param ownerKey Owner delivery key; null when no INTENT.md governs the file.
 * @param ownerRelDir Owning fractal directory relative to the boundary (gate label).
 * @param selfDelivery True when the call targets an INTENT.md itself — delivery is stamped but no ctx or guide is emitted; the map still follows the visit set.
 * @param relDir Visited directory relative to the boundary, for the map block.
 * @param ctxBlock Lazy renderer of the [filid:ctx] pointer block.
 * @returns Hook output carrying a deny, additional context, or nothing.
 */
export function buildDeliveryOutput(
  decision: VisitDecision,
  gateEligible: boolean,
  ownerKey: string | null,
  ownerRelDir: string,
  selfDelivery: boolean,
  relDir: string,
  ctxBlock: () => string,
): HookOutput {
  if (gateEligible && decision.deliveredState === 'none')
    return buildGateDeny(ownerRelDir, ctxBlock(), decision.guideNeeded);

  const blocks: string[] = [];
  if (
    ownerKey !== null &&
    decision.deliveredState !== 'fresh' &&
    !selfDelivery
  ) {
    if (decision.guideNeeded) blocks.push(HOOK_GUIDE_BLOCK);
    blocks.push(ctxBlock());
  }
  if (decision.mapChanged) blocks.push(buildMapBlock(decision.reads, relDir));

  const additionalContext = blocks.join('\n');
  if (!additionalContext.trim()) return { continue: true };

  return {
    continue: true,
    hookSpecificOutput: { additionalContext },
  };
}
