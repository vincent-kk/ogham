/**
 * @file insight-stats.test.ts
 * @description insight-stats.ts 유닛 테스트 — config, stats, pending notification, meta-prompt
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  appendPendingCapture,
  buildMetaPrompt,
  deletePendingNotification,
  getSessionCaptureCount,
  incrementInsightStats,
  readInsightConfig,
  readInsightStats,
  readPendingNotification,
  writeInsightConfig,
} from '../../../core/insight-stats.js';
import {
  DEFAULT_INSIGHT_CONFIG,
  DEFAULT_INSIGHT_STATS,
} from '../../../types/insight.js';

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

function createTempDir(): string {
  return mkdtempSync(join(tmpdir(), 'maencof-insight-test-'));
}

function removeDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

function metaDir(cwd: string): string {
  return join(cwd, '.maencof-meta');
}

// ─── readInsightConfig ────────────────────────────────────────────────────────

describe('readInsightConfig', () => {
  let cwd: string;

  beforeEach(() => {
    cwd = createTempDir();
  });

  afterEach(() => {
    removeDir(cwd);
  });

  it('파일이 없으면 기본값을 반환한다', () => {
    const config = readInsightConfig(cwd);
    expect(config).toEqual(DEFAULT_INSIGHT_CONFIG);
  });

  it('유효한 config 파일을 읽어 반환한다', () => {
    const customConfig = {
      enabled: false,
      sensitivity: 'high',
      max_captures_per_session: 5,
      notify: false,
    };
    mkdirSync(metaDir(cwd), { recursive: true });
    writeFileSync(
      join(metaDir(cwd), 'insight-config.json'),
      JSON.stringify(customConfig),
      'utf-8',
    );

    const config = readInsightConfig(cwd);
    expect(config.enabled).toBe(false);
    expect(config.sensitivity).toBe('high');
    expect(config.max_captures_per_session).toBe(5);
    expect(config.notify).toBe(false);
  });

  it('잘못된 JSON이면 기본값을 반환한다', () => {
    mkdirSync(metaDir(cwd), { recursive: true });
    writeFileSync(
      join(metaDir(cwd), 'insight-config.json'),
      '{invalid json',
      'utf-8',
    );

    const config = readInsightConfig(cwd);
    expect(config).toEqual(DEFAULT_INSIGHT_CONFIG);
  });

  it('스키마 불일치 데이터는 기본값을 반환한다', () => {
    mkdirSync(metaDir(cwd), { recursive: true });
    writeFileSync(
      join(metaDir(cwd), 'insight-config.json'),
      JSON.stringify({ enabled: 'yes', sensitivity: 'ultra' }),
      'utf-8',
    );

    const config = readInsightConfig(cwd);
    expect(config).toEqual(DEFAULT_INSIGHT_CONFIG);
  });
});

// ─── writeInsightConfig ───────────────────────────────────────────────────────

describe('writeInsightConfig', () => {
  let cwd: string;

  beforeEach(() => {
    cwd = createTempDir();
  });

  afterEach(() => {
    removeDir(cwd);
  });

  it('round-trip: write 후 read가 동일한 값을 반환한다', () => {
    const config = {
      enabled: false,
      sensitivity: 'low' as const,
      max_captures_per_session: 3,
      notify: false,
    };

    writeInsightConfig(cwd, config);
    const read = readInsightConfig(cwd);

    expect(read).toEqual(config);
  });

  it('디렉토리가 없어도 자동으로 생성한다', () => {
    const nestedCwd = join(cwd, 'nested', 'deep');
    mkdirSync(nestedCwd, { recursive: true });

    writeInsightConfig(nestedCwd, DEFAULT_INSIGHT_CONFIG);
    const read = readInsightConfig(nestedCwd);
    expect(read).toEqual(DEFAULT_INSIGHT_CONFIG);
  });
});

// ─── readInsightStats ─────────────────────────────────────────────────────────

describe('readInsightStats', () => {
  let cwd: string;

  beforeEach(() => {
    cwd = createTempDir();
  });

  afterEach(() => {
    removeDir(cwd);
  });

  it('파일이 없으면 기본값을 반환한다', () => {
    const stats = readInsightStats(cwd);
    expect(stats.total_captured).toBe(0);
    expect(stats.l2_direct).toBe(0);
    expect(stats.l5_captured).toBe(0);
    expect(stats.l5_promoted).toBe(0);
    expect(stats.l5_archived).toBe(0);
  });
});

// ─── incrementInsightStats ────────────────────────────────────────────────────

describe('incrementInsightStats', () => {
  let cwd: string;

  beforeEach(() => {
    cwd = createTempDir();
  });

  afterEach(() => {
    removeDir(cwd);
  });

  it('L2 increment: l2_direct와 total_captured를 증가시킨다', () => {
    incrementInsightStats(cwd, 2);
    const stats = readInsightStats(cwd);

    expect(stats.l2_direct).toBe(1);
    expect(stats.total_captured).toBe(1);
    expect(stats.l5_captured).toBe(0);
  });

  it('L5 increment: l5_captured와 total_captured를 증가시킨다', () => {
    incrementInsightStats(cwd, 5);
    const stats = readInsightStats(cwd);

    expect(stats.l5_captured).toBe(1);
    expect(stats.total_captured).toBe(1);
    expect(stats.l2_direct).toBe(0);
  });

  it('여러 번 호출하면 total이 누적된다', () => {
    incrementInsightStats(cwd, 2);
    incrementInsightStats(cwd, 5);
    incrementInsightStats(cwd, 2);
    const stats = readInsightStats(cwd);

    expect(stats.total_captured).toBe(3);
    expect(stats.l2_direct).toBe(2);
    expect(stats.l5_captured).toBe(1);
  });

  it('updatedAt이 업데이트된다', () => {
    const before = new Date().toISOString();
    incrementInsightStats(cwd, 2);
    const stats = readInsightStats(cwd);

    expect(stats.updatedAt >= before).toBe(true);
  });
});

// ─── appendPendingCapture ─────────────────────────────────────────────────────

describe('appendPendingCapture', () => {
  let cwd: string;

  beforeEach(() => {
    cwd = createTempDir();
  });

  afterEach(() => {
    removeDir(cwd);
  });

  it('새 파일을 생성하고 capture를 추가한다', () => {
    appendPendingCapture(
      cwd,
      { path: '02_Derived/test.md', title: 'Test', layer: 2 },
      'session-1',
    );

    const notification = readPendingNotification(cwd);
    expect(notification).not.toBeNull();
    expect(notification!.captures).toHaveLength(1);
    expect(notification!.captures[0].title).toBe('Test');
    expect(notification!.captures[0].layer).toBe(2);
    expect(notification!.sessionId).toBe('session-1');
  });

  it('기존 파일에 capture를 추가한다 (누적)', () => {
    appendPendingCapture(
      cwd,
      { path: '02_Derived/a.md', title: 'A', layer: 2 },
      'session-1',
    );
    appendPendingCapture(
      cwd,
      { path: '05_Context/b.md', title: 'B', layer: 5 },
      'session-1',
    );

    const notification = readPendingNotification(cwd);
    expect(notification!.captures).toHaveLength(2);
    expect(notification!.captures[1].title).toBe('B');
  });
});

// ─── deletePendingNotification ────────────────────────────────────────────────

describe('deletePendingNotification', () => {
  let cwd: string;

  beforeEach(() => {
    cwd = createTempDir();
  });

  afterEach(() => {
    removeDir(cwd);
  });

  it('존재하는 파일을 삭제한다', () => {
    appendPendingCapture(
      cwd,
      { path: '02_Derived/test.md', title: 'Test', layer: 2 },
      'session-1',
    );

    deletePendingNotification(cwd);

    const notification = readPendingNotification(cwd);
    expect(notification).toBeNull();
  });

  it('파일이 없어도 에러 없이 처리한다 (silent)', () => {
    expect(() => deletePendingNotification(cwd)).not.toThrow();
  });
});

// ─── getSessionCaptureCount ───────────────────────────────────────────────────

describe('getSessionCaptureCount', () => {
  let cwd: string;

  beforeEach(() => {
    cwd = createTempDir();
  });

  afterEach(() => {
    removeDir(cwd);
  });

  it('파일이 없으면 0을 반환한다', () => {
    expect(getSessionCaptureCount(cwd)).toBe(0);
  });

  it('pending 파일의 captures 수를 반환한다', () => {
    appendPendingCapture(
      cwd,
      { path: '02_Derived/a.md', title: 'A', layer: 2 },
      'session-1',
    );
    appendPendingCapture(
      cwd,
      { path: '05_Context/b.md', title: 'B', layer: 5 },
      'session-1',
    );

    expect(getSessionCaptureCount(cwd)).toBe(2);
  });
});

// ─── buildMetaPrompt ──────────────────────────────────────────────────────────

describe('buildMetaPrompt', () => {
  it('medium sensitivity criteria가 포함된다', () => {
    const config = {
      ...DEFAULT_INSIGHT_CONFIG,
      sensitivity: 'medium' as const,
    };
    const prompt = buildMetaPrompt(config);

    expect(prompt).toContain('medium');
    expect(prompt).toContain('conclusions');
  });

  it('high sensitivity criteria가 포함된다', () => {
    const config = { ...DEFAULT_INSIGHT_CONFIG, sensitivity: 'high' as const };
    const prompt = buildMetaPrompt(config);

    expect(prompt).toContain('high');
    expect(prompt).toContain('all opinions');
  });

  it('low sensitivity criteria가 포함된다', () => {
    const config = { ...DEFAULT_INSIGHT_CONFIG, sensitivity: 'low' as const };
    const prompt = buildMetaPrompt(config);

    expect(prompt).toContain('low');
    expect(prompt).toContain('only verified');
  });

  it('compact output: 10줄 이하이다', () => {
    const prompt = buildMetaPrompt(DEFAULT_INSIGHT_CONFIG);
    const lines = prompt.split('\n').filter((l) => l.trim().length > 0);
    expect(lines.length).toBeLessThanOrEqual(10);
  });

  it('config 값이 출력에 포함된다 (max, sensitivity)', () => {
    const config = {
      enabled: true,
      sensitivity: 'high' as const,
      max_captures_per_session: 7,
      notify: true,
    };
    const prompt = buildMetaPrompt(config);

    expect(prompt).toContain('max="7"');
    expect(prompt).toContain('sensitivity="high"');
  });

  it('enabled=false도 출력에 반영된다', () => {
    const config = { ...DEFAULT_INSIGHT_CONFIG, enabled: false };
    const prompt = buildMetaPrompt(config);

    expect(prompt).toContain('enabled="false"');
  });
});
