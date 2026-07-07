/**
 * @file denyEnvelope.test.ts
 * @description PreToolUse stdout 계약 번역 테스트 — 관심사 차단(continue:false)이
 * permissionDecision:"deny"로 번역되고 top-level continue:false가 절대 노출되지 않는다.
 */
import { describe, expect, it } from 'vitest';

import { toPreToolUseEnvelope } from '../../hooks/preToolUse/helpers/denyEnvelope/denyEnvelope.js';

describe('toPreToolUseEnvelope', () => {
  it('차단 결과를 permissionDecision:"deny" + reason으로 번역한다', () => {
    const envelope = toPreToolUseEnvelope({
      continue: false,
      reason: '[maencof] Layer 1 write restricted.',
    });

    expect(envelope.continue).toBe(true);
    expect(envelope.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(envelope.hookSpecificOutput?.permissionDecisionReason).toBe(
      '[maencof] Layer 1 write restricted.',
    );
  });

  it('통과 결과는 additionalContext를 보존한 채 그대로 통과한다', () => {
    const envelope = toPreToolUseEnvelope({
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        additionalContext: '[maencof] use kg_search',
      },
    });

    expect(envelope.continue).toBe(true);
    expect(envelope.hookSpecificOutput?.permissionDecision).toBeUndefined();
    expect(envelope.hookSpecificOutput?.additionalContext).toBe(
      '[maencof] use kg_search',
    );
  });

  it('차단 시에도 다른 관심사의 additionalContext와 systemMessage를 보존한다', () => {
    const envelope = toPreToolUseEnvelope({
      continue: false,
      reason: 'blocked',
      systemMessage: 'operator warning',
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        additionalContext: 'advisory',
      },
    });

    expect(envelope.systemMessage).toBe('operator warning');
    expect(envelope.hookSpecificOutput?.additionalContext).toBe('advisory');
    expect(envelope.hookSpecificOutput?.permissionDecision).toBe('deny');
  });

  it('reason 없는 차단에는 fallback 사유를 채운다', () => {
    const envelope = toPreToolUseEnvelope({ continue: false });

    expect(envelope.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(envelope.hookSpecificOutput?.permissionDecisionReason).toContain(
      '[maencof]',
    );
  });
});
