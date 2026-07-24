/**
 * @file probeAdvisory.test.ts
 * @description selfProbe 오류 필터 테스트 — env 미전파(정상 동작) 신호는 경고에서 제외.
 */
import { join } from 'node:path';

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

  it('경고가 안내하는 error-log 경로는 호스트를 따른다', () => {
    // 문구가 `~/.claude/plugins/maencof/error-log.json` 하드코딩이던 시절,
    // Codex 세션에서는 존재하지도 않는 파일로 사용자를 보냈다. 훅이 실제로
    // 쓰는 경로(`errorLogPath`)에서 문구를 파생시켜야 둘이 어긋날 수 없다.
    const origData = process.env.PLUGIN_DATA;
    const origCodex = process.env.CODEX_HOME;
    process.env.PLUGIN_DATA = '1';
    process.env.CODEX_HOME = join('/custom', 'codex');
    try {
      const { advisory } = buildProbeAdvisory(['git --version failed']);
      expect(advisory).toContain(
        join('/custom', 'codex', 'plugins', 'maencof', 'error-log.json'),
      );
      expect(advisory).not.toContain('.claude');
    } finally {
      if (origData === undefined) delete process.env.PLUGIN_DATA;
      else process.env.PLUGIN_DATA = origData;
      if (origCodex === undefined) delete process.env.CODEX_HOME;
      else process.env.CODEX_HOME = origCodex;
    }
  });
});
