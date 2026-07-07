/**
 * @file denyEnvelope.ts
 * @description Merged concern result → Claude Code PreToolUse stdout 계약 번역.
 *
 * 관심사 수준의 차단(`continue:false` + `reason`)을 `permissionDecision:"deny"` +
 * `permissionDecisionReason`(Claude에게 표시되는 유일한 채널)으로 변환한다.
 * top-level `continue:false`는 턴 전체를 중단시키고 `reason`을 버리므로 금지.
 */
import type {
  MergedHookOutput,
  PreToolUseStdoutEnvelope,
} from '../../../../types/dispatch.js';

const FALLBACK_DENY_REASON =
  '[maencof] Tool call denied by the maencof PreToolUse guard.';

export function toPreToolUseEnvelope(
  merged: MergedHookOutput,
): PreToolUseStdoutEnvelope {
  const additionalContext = merged.hookSpecificOutput?.additionalContext;

  if (merged.continue !== false) {
    const envelope: PreToolUseStdoutEnvelope = { continue: true };
    if (merged.systemMessage) envelope.systemMessage = merged.systemMessage;
    if (additionalContext)
      envelope.hookSpecificOutput = {
        hookEventName: 'PreToolUse',
        additionalContext,
      };
    return envelope;
  }

  return {
    continue: true,
    ...(merged.systemMessage ? { systemMessage: merged.systemMessage } : {}),
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: merged.reason ?? FALLBACK_DENY_REASON,
      ...(additionalContext ? { additionalContext } : {}),
    },
  };
}
