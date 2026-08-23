import {
  HOOK_GATE_RETRY_GUIDANCE,
  HOOK_GUIDE_BLOCK,
} from '../../../../../constants/hookContext.js';
import type { HookOutput } from '../../../../../types/hooks.js';

/**
 * Gate deny for an undelivered-module mutation. The deny IS the delivery:
 * the reason carries the guide legend (first delivery of the scope), the
 * gate directive and the owner pointer block — the agent is told exactly
 * which file to read, and the identical retry passes.
 * @param ownerRelDir Owning fractal directory, relative to the boundary (label only).
 * @param ctxBlock Rendered [filid:ctx] pointer block for this visit.
 * @param guideNeeded True exactly once per scope — prepend the guide legend.
 * @returns Deny decision whose reason carries the read directive.
 */
export function buildGateDeny(
  ownerRelDir: string,
  ctxBlock: string,
  guideNeeded: boolean,
): HookOutput {
  const parts: string[] = [];
  if (guideNeeded) parts.push(HOOK_GUIDE_BLOCK);
  parts.push(
    `[filid:gate] First mutation in module '${ownerRelDir}' before its INTENT.md pointer was delivered this session. ${HOOK_GATE_RETRY_GUIDANCE}`,
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
