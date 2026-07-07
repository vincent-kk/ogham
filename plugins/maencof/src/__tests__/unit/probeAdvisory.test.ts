/**
 * @file probeAdvisory.test.ts
 * @description selfProbe 오류 필터 테스트 — env 미전파(정상 동작) 신호는 경고에서 제외.
 */
import { describe, expect, it } from 'vitest';

import { buildProbeAdvisory } from '../../hooks/sessionStart/helpers/probeAdvisory/probeAdvisory.js';

describe('buildProbeAdvisory', () => {
  it('CLAUDE_PLUGIN_ROOT 부재만 있으면 경고를 만들지 않는다', () => {
    const { actionable, advisory } = buildProbeAdvisory([
      'CLAUDE_PLUGIN_ROOT not set',
    ]);

    expect(actionable).toEqual([]);
    expect(advisory).toBeNull();
  });

  it('실제 실패는 필터를 통과해 경고 본문에 남는다', () => {
    const { actionable, advisory } = buildProbeAdvisory([
      'CLAUDE_PLUGIN_ROOT not set',
      'git --version failed (code=127, error=spawn git ENOENT)',
    ]);

    expect(actionable).toHaveLength(1);
    expect(advisory).toContain('git --version failed');
    expect(advisory).not.toContain('CLAUDE_PLUGIN_ROOT');
  });

  it('오류가 없으면 경고도 없다', () => {
    expect(buildProbeAdvisory([]).advisory).toBeNull();
  });
});
