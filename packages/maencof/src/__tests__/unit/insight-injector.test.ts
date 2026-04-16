/**
 * @file insight-injector.test.ts
 * @description runInsightInjector 유닛 테스트 — UserPromptSubmit hook
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getSessionCaptureCount,
  readInsightConfig,
} from '../../core/insight-stats/insight-stats.js';
import { runInsightInjector } from '../../hooks/insight-injector/insight-injector.js';
import { isMaencofVault } from '../../hooks/shared/shared.js';
import { DEFAULT_INSIGHT_CONFIG } from '../../types/insight.js';

// ─── Mock 설정 ────────────────────────────────────────────────────────────────

vi.mock('../../hooks/shared/shared.js', () => ({
  isMaencofVault: vi.fn(),
}));

vi.mock('../../core/insight-stats/insight-stats.js', () => ({
  readInsightConfig: vi.fn(),
  getSessionCaptureCount: vi.fn(),
}));

const mockIsMaencofVault = vi.mocked(isMaencofVault);
const mockReadInsightConfig = vi.mocked(readInsightConfig);
const mockGetSessionCaptureCount = vi.mocked(getSessionCaptureCount);

// ─── 테스트 ───────────────────────────────────────────────────────────────────

describe('runInsightInjector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 기본값: vault, enabled, 0개 captured
    mockIsMaencofVault.mockReturnValue(true);
    mockReadInsightConfig.mockReturnValue({ ...DEFAULT_INSIGHT_CONFIG });
    mockGetSessionCaptureCount.mockReturnValue(0);
  });

  it('cwd가 없으면 { continue: true }만 반환한다', () => {
    const result = runInsightInjector({});
    expect(result).toEqual({ continue: true });
    expect(mockIsMaencofVault).not.toHaveBeenCalled();
  });

  it('non-vault이면 { continue: true }만 반환한다', () => {
    mockIsMaencofVault.mockReturnValue(false);

    const result = runInsightInjector({ cwd: '/some/dir' });
    expect(result).toEqual({ continue: true });
    expect(mockReadInsightConfig).not.toHaveBeenCalled();
  });

  it('enabled=false이면 { continue: true }만 반환한다', () => {
    mockReadInsightConfig.mockReturnValue({
      ...DEFAULT_INSIGHT_CONFIG,
      enabled: false,
    });

    const result = runInsightInjector({ cwd: '/vault' });
    expect(result).toEqual({ continue: true });
    expect(mockGetSessionCaptureCount).not.toHaveBeenCalled();
  });

  it('enabled이고 한도 미달이면 status="active" additionalContext를 반환한다', () => {
    mockReadInsightConfig.mockReturnValue({
      ...DEFAULT_INSIGHT_CONFIG,
      enabled: true,
      sensitivity: 'medium',
      max_captures_per_session: 10,
    });
    mockGetSessionCaptureCount.mockReturnValue(3);

    const result = runInsightInjector({ cwd: '/vault' });
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput).toBeDefined();
    expect(result.hookSpecificOutput?.hookEventName).toBe('UserPromptSubmit');
    const ctx = result.hookSpecificOutput?.additionalContext ?? '';
    expect(ctx).toContain('status="active"');
    expect(ctx).toContain('sensitivity="medium"');
  });

  it('한도 초과이면 status="limit-reached" additionalContext를 반환한다', () => {
    mockReadInsightConfig.mockReturnValue({
      ...DEFAULT_INSIGHT_CONFIG,
      enabled: true,
      max_captures_per_session: 5,
    });
    mockGetSessionCaptureCount.mockReturnValue(5);

    const result = runInsightInjector({ cwd: '/vault' });
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput).toBeDefined();
    expect(result.hookSpecificOutput?.additionalContext).toContain(
      'status="limit-reached"',
    );
  });

  it('captured/max 형식이 올바르다', () => {
    mockReadInsightConfig.mockReturnValue({
      ...DEFAULT_INSIGHT_CONFIG,
      enabled: true,
      max_captures_per_session: 10,
    });
    mockGetSessionCaptureCount.mockReturnValue(4);

    const result = runInsightInjector({ cwd: '/vault' });
    expect(result.hookSpecificOutput?.additionalContext).toContain(
      'captured="4/10"',
    );
  });

  it('limit-reached일 때 captured/max 형식이 올바르다', () => {
    mockReadInsightConfig.mockReturnValue({
      ...DEFAULT_INSIGHT_CONFIG,
      enabled: true,
      max_captures_per_session: 7,
    });
    mockGetSessionCaptureCount.mockReturnValue(7);

    const result = runInsightInjector({ cwd: '/vault' });
    expect(result.hookSpecificOutput?.additionalContext).toContain(
      'captured="7/7"',
    );
  });

  it('max=0이면 limit 체크 없이 active 상태를 반환한다', () => {
    mockReadInsightConfig.mockReturnValue({
      ...DEFAULT_INSIGHT_CONFIG,
      enabled: true,
      max_captures_per_session: 0,
    });
    mockGetSessionCaptureCount.mockReturnValue(100);

    const result = runInsightInjector({ cwd: '/vault' });
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.additionalContext).toContain(
      'status="active"',
    );
  });

  it('top-level hookMessage나 message 필드를 방출하지 않는다 (schema compliance)', () => {
    mockReadInsightConfig.mockReturnValue({
      ...DEFAULT_INSIGHT_CONFIG,
      enabled: true,
      max_captures_per_session: 10,
    });
    mockGetSessionCaptureCount.mockReturnValue(1);

    const result = runInsightInjector({ cwd: '/vault' }) as unknown as Record<
      string,
      unknown
    >;
    expect('hookMessage' in result).toBe(false);
    expect('message' in result).toBe(false);
  });
});
