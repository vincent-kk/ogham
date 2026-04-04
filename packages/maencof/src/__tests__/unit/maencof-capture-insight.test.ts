/**
 * @file maencof-capture-insight.test.ts
 * @description handleCaptureInsight 유닛 테스트 — MCP tool handler
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  appendPendingCapture,
  getSessionCaptureCount,
  incrementInsightStats,
  readInsightConfig,
} from '../../core/insight-stats/insight-stats.js';
import { handleCaptureInsight } from '../../mcp/tools/maencof-capture-insight/maencof-capture-insight.js';
import { handleMaencofCreate } from '../../mcp/tools/maencof-create/maencof-create.js';
import { DEFAULT_INSIGHT_CONFIG } from '../../types/insight.js';

// ─── Mock 설정 ────────────────────────────────────────────────────────────────

vi.mock('../../mcp/tools/maencof-create/maencof-create.js', () => ({
  handleMaencofCreate: vi.fn(),
}));

vi.mock('../../core/insight-stats/insight-stats.js', () => ({
  readInsightConfig: vi.fn(),
  getSessionCaptureCount: vi.fn(),
  incrementInsightStats: vi.fn(),
  appendPendingCapture: vi.fn(),
}));

const mockHandleMaencofCreate = vi.mocked(handleMaencofCreate);
const mockReadInsightConfig = vi.mocked(readInsightConfig);
const mockGetSessionCaptureCount = vi.mocked(getSessionCaptureCount);
const mockIncrementInsightStats = vi.mocked(incrementInsightStats);
const mockAppendPendingCapture = vi.mocked(appendPendingCapture);

// ─── 기본 성공 결과 ────────────────────────────────────────────────────────────

const SUCCESS_RESULT = {
  success: true,
  path: '02_Derived/test-insight.md',
  message: 'Created successfully',
};

const FAILURE_RESULT = {
  success: false,
  path: '',
  message: 'Create failed',
};

// ─── 테스트 ───────────────────────────────────────────────────────────────────

describe('handleCaptureInsight', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 기본값: 한도 미달, 성공 생성
    mockReadInsightConfig.mockReturnValue({ ...DEFAULT_INSIGHT_CONFIG });
    mockGetSessionCaptureCount.mockReturnValue(0);
    mockHandleMaencofCreate.mockResolvedValue(SUCCESS_RESULT);
  });

  it('기본 캡처: handleMaencofCreate가 auto-insight 태그와 함께 호출된다', async () => {
    const result = await handleCaptureInsight('/vault', {
      title: 'Test Insight',
      content: 'Some content',
      layer: 2,
      tags: ['learning'],
    });

    expect(mockHandleMaencofCreate).toHaveBeenCalledOnce();
    const callArgs = mockHandleMaencofCreate.mock.calls[0];
    expect(callArgs[1].tags).toContain('auto-insight');
    expect(result.success).toBe(true);
  });

  it('태그 중복 방지: auto-insight가 이미 있으면 중복 추가하지 않는다', async () => {
    await handleCaptureInsight('/vault', {
      title: 'Test',
      content: 'Content',
      layer: 2,
      tags: ['auto-insight', 'learning'],
    });

    const callArgs = mockHandleMaencofCreate.mock.calls[0];
    const tags = callArgs[1].tags as string[];
    const autoInsightCount = tags.filter((t) => t === 'auto-insight').length;
    expect(autoInsightCount).toBe(1);
  });

  it('context 포함: content가 Context 섹션과 함께 prepend된다', async () => {
    await handleCaptureInsight('/vault', {
      title: 'Test',
      content: 'Main content',
      layer: 2,
      tags: ['test'],
      context: 'User was discussing React hooks',
    });

    const callArgs = mockHandleMaencofCreate.mock.calls[0];
    const content = callArgs[1].content as string;
    expect(content).toContain('## Context');
    expect(content).toContain('User was discussing React hooks');
    expect(content).toContain('Main content');
    // Context가 앞에 온다
    expect(content.indexOf('## Context')).toBeLessThan(
      content.indexOf('Main content'),
    );
  });

  it('context 없이 호출하면 content가 그대로 전달된다', async () => {
    await handleCaptureInsight('/vault', {
      title: 'Test',
      content: 'Just content',
      layer: 2,
      tags: ['test'],
    });

    const callArgs = mockHandleMaencofCreate.mock.calls[0];
    expect(callArgs[1].content).toBe('Just content');
  });

  it('한도 초과: { success: false }를 반환하고 create를 호출하지 않는다', async () => {
    mockReadInsightConfig.mockReturnValue({
      ...DEFAULT_INSIGHT_CONFIG,
      max_captures_per_session: 5,
    });
    mockGetSessionCaptureCount.mockReturnValue(5);

    const result = await handleCaptureInsight('/vault', {
      title: 'Test',
      content: 'Content',
      layer: 2,
      tags: ['test'],
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('limit');
    expect(mockHandleMaencofCreate).not.toHaveBeenCalled();
  });

  it('성공 시 incrementInsightStats와 appendPendingCapture가 호출된다', async () => {
    await handleCaptureInsight(
      '/vault',
      {
        title: 'My Insight',
        content: 'Content',
        layer: 2,
        tags: ['test'],
      },
      'session-abc',
    );

    expect(mockIncrementInsightStats).toHaveBeenCalledOnce();
    expect(mockIncrementInsightStats).toHaveBeenCalledWith('/vault', 2);

    expect(mockAppendPendingCapture).toHaveBeenCalledOnce();
    const appendArgs = mockAppendPendingCapture.mock.calls[0];
    expect(appendArgs[1].title).toBe('My Insight');
    expect(appendArgs[1].layer).toBe(2);
    expect(appendArgs[2]).toBe('session-abc');
  });

  it('실패 시 bookkeeping이 호출되지 않는다', async () => {
    mockHandleMaencofCreate.mockResolvedValue(FAILURE_RESULT);

    const result = await handleCaptureInsight('/vault', {
      title: 'Test',
      content: 'Content',
      layer: 2,
      tags: ['test'],
    });

    expect(result.success).toBe(false);
    expect(mockIncrementInsightStats).not.toHaveBeenCalled();
    expect(mockAppendPendingCapture).not.toHaveBeenCalled();
  });

  it('max_captures_per_session=0이면 한도 체크를 건너뛴다', async () => {
    mockReadInsightConfig.mockReturnValue({
      ...DEFAULT_INSIGHT_CONFIG,
      max_captures_per_session: 0,
    });
    mockGetSessionCaptureCount.mockReturnValue(999);

    const result = await handleCaptureInsight('/vault', {
      title: 'Test',
      content: 'Content',
      layer: 2,
      tags: ['test'],
    });

    expect(result.success).toBe(true);
    expect(mockHandleMaencofCreate).toHaveBeenCalled();
  });

  it('sessionId가 없으면 "unknown"으로 appendPendingCapture를 호출한다', async () => {
    await handleCaptureInsight('/vault', {
      title: 'Test',
      content: 'Content',
      layer: 5,
      tags: ['test'],
    });

    const appendArgs = mockAppendPendingCapture.mock.calls[0];
    expect(appendArgs[2]).toBe('unknown');
  });

  it('L5 layer도 올바르게 처리된다', async () => {
    mockHandleMaencofCreate.mockResolvedValue({
      success: true,
      path: '05_Context/test.md',
      message: 'Created',
    });

    await handleCaptureInsight(
      '/vault',
      {
        title: 'L5 Insight',
        content: 'Context note',
        layer: 5,
        tags: ['exploration'],
      },
      'sess-1',
    );

    expect(mockIncrementInsightStats).toHaveBeenCalledWith('/vault', 5);
    const appendArgs = mockAppendPendingCapture.mock.calls[0];
    expect(appendArgs[1].layer).toBe(5);
  });
});
