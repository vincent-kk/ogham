import { GUIDE_BLOCK } from '../../../../../constants/agentContext.js';
import type { VisitDecision } from '../../../../../core/infra/cacheManager/cacheManager.js';
import type { HookOutput } from '../../../../../types/hooks.js';

import { buildGateDeny } from './buildGateDeny.js';
import { buildMapBlock } from './buildMapBlock.js';

/**
 * Assemble the post-commitVisit output: gate-deny (undelivered mutation) or
 * the ctx/guide/map blocks for the resolved delivery state.
 */
export function buildDeliveryOutput(
  decision: VisitDecision,
  gateEligible: boolean,
  ownerKey: string | null,
  ownerRelDir: string,
  selfAuthoring: boolean,
  relDir: string,
  ctxBlock: () => string,
): HookOutput {
  if (gateEligible && decision.deliveredState === 'none')
    return buildGateDeny(ownerRelDir, ctxBlock(), decision.guideNeeded);

  const blocks: string[] = [];
  if (
    ownerKey !== null &&
    decision.deliveredState !== 'fresh' &&
    !selfAuthoring
  ) {
    if (decision.guideNeeded) blocks.push(GUIDE_BLOCK);
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
