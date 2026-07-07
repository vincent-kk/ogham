/**
 * @file maencofMcpTools.test.ts
 * @description PostToolUse allowlist의 full-form MCP 도구명 정규화 계약 테스트.
 * Claude Code 훅 입력은 `mcp__plugin_maencof_t__<tool>` full-form을 나른다.
 */
import { describe, expect, it } from 'vitest';

import {
  isMaencofMcpToolName,
  normalizeMaencofToolName,
} from '../../hooks/shared/maencofMcpTools.js';

describe('normalizeMaencofToolName', () => {
  it('플러그인 full-form을 bare 도구명으로 정규화한다', () => {
    expect(normalizeMaencofToolName('mcp__plugin_maencof_t__create')).toBe(
      'create',
    );
    expect(
      normalizeMaencofToolName('mcp__plugin_maencof_t__capture_insight'),
    ).toBe('capture_insight');
  });

  it('플러그인 접두 없는 standalone 서버 full-form도 정규화한다', () => {
    expect(normalizeMaencofToolName('mcp__maencof__kg_build')).toBe('kg_build');
  });

  it('bare 이름과 무관한 도구명은 그대로 통과시킨다', () => {
    expect(normalizeMaencofToolName('create')).toBe('create');
    expect(normalizeMaencofToolName('Write')).toBe('Write');
  });

  it('타 서버(full-form) 도구명은 정규화하지 않는다 — maencof-lens 포함', () => {
    expect(normalizeMaencofToolName('mcp__plugin_maencof-lens_t__read')).toBe(
      'mcp__plugin_maencof-lens_t__read',
    );
    expect(normalizeMaencofToolName('mcp__other-server__create')).toBe(
      'mcp__other-server__create',
    );
  });
});

describe('isMaencofMcpToolName', () => {
  it('write 도구는 full-form과 bare 모두 허용한다', () => {
    expect(isMaencofMcpToolName('mcp__plugin_maencof_t__create')).toBe(true);
    expect(isMaencofMcpToolName('update')).toBe(true);
  });

  it('read 전용 도구와 타 서버 write 도구는 거부한다', () => {
    expect(isMaencofMcpToolName('mcp__plugin_maencof_t__kg_search')).toBe(
      false,
    );
    expect(isMaencofMcpToolName('mcp__plugin_maencof-lens_t__read')).toBe(
      false,
    );
    expect(isMaencofMcpToolName('mcp__other-server__create')).toBe(false);
  });
});
