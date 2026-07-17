import {
  GATE_RETRY_GUIDANCE,
  GUIDE_BLOCK,
} from '../../../../../constants/agentContext.js';
import type { HookOutput } from '../../../../../types/hooks.js';

/**
 * Gate deny for an undelivered-module mutation. The deny IS the delivery:
 * the reason carries the guide legend (first delivery of the scope), the
 * gate directive, and the owner INTENT ctx block inline — rules arrive
 * before the first mutation, and the identical retry passes.
 */
export function buildGateDeny(
  ownerRelDir: string,
  ctxBlock: string,
  guideNeeded: boolean,
): HookOutput {
  const parts: string[] = [];
  if (guideNeeded) parts.push(GUIDE_BLOCK);
  parts.push(
    `[filid:gate] First mutation in module '${ownerRelDir}' before its INTENT rules were delivered this session. ${GATE_RETRY_GUIDANCE}`,
  );
  parts.push(ctxBlock);
  return {
    continue: true,
    hookSpecificOutput: {
      permissionDecision: 'deny',
      permissionDecisionReason: parts.join('\n'),
    },
  };
}
