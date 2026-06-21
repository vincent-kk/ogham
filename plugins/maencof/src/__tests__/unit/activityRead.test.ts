/**
 * @file activityRead.test.ts
 * @description activity_read MCP 도구 핸들러 테스트 (활동 이벤트 로그 = NDJSON)
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getActivityEventPath } from '../../core/activityLog/activityLog.js';
import { formatDate } from '../../core/dateFormat/dateFormat.js';
import { handleActivityRead } from '../../mcp/tools/activityRead/activityRead.js';
import type { ActivityEntry } from '../../types/activity.js';

function createTempVault(): string {
  const dir = mkdtempSync(join(tmpdir(), 'maencof-actread-test-'));
  mkdirSync(join(dir, '.maencof'), { recursive: true });
  mkdirSync(join(dir, '.maencof-meta'), { recursive: true });
  return dir;
}

/** 활동 이벤트(NDJSON) 작성 헬퍼. */
function writeEvents(
  vaultDir: string,
  date: string,
  entries: ActivityEntry[],
): void {
  const filePath = getActivityEventPath(vaultDir, date);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(
    filePath,
    entries.map((e) => JSON.stringify(e)).join('\n') + '\n',
    'utf-8',
  );
}

const sample: ActivityEntry[] = [
  {
    time: '09:16',
    category: 'document',
    description: '문서 생성 (L2)',
    path: '02_Derived/test.md',
  },
  { time: '10:30', category: 'config', description: 'CLAUDE.md 병합' },
  { time: '10:35', category: 'search', description: 'KG 검색' },
];

describe('handleActivityRead', () => {
  let vaultDir: string;

  beforeEach(() => {
    vaultDir = createTempVault();
  });

  afterEach(() => {
    rmSync(vaultDir, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 100,
    });
  });

  it('특정 날짜의 활동을 조회한다', () => {
    writeEvents(vaultDir, '2026-06-21', sample);

    const result = handleActivityRead(vaultDir, { date: '2026-06-21' });
    expect(result.notes).toHaveLength(1);
    expect(result.notes[0].date).toBe('2026-06-21');
    expect(result.notes[0].entries).toHaveLength(3);
    expect(result.total_entries).toBe(3);
  });

  it('카테고리 필터를 적용한다', () => {
    writeEvents(vaultDir, '2026-06-21', sample);

    const result = handleActivityRead(vaultDir, {
      date: '2026-06-21',
      category: 'document',
    });
    expect(result.notes[0].entries).toHaveLength(1);
    expect(result.notes[0].entries[0].category).toBe('document');
    expect(result.total_entries).toBe(1);
  });

  it('파일이 없으면 빈 결과를 반환한다', () => {
    const result = handleActivityRead(vaultDir, { date: '2099-01-01' });
    expect(result.notes).toHaveLength(0);
    expect(result.total_entries).toBe(0);
  });

  it('last_days로 최근 N일을 조회한다', () => {
    const today = formatDate(new Date());
    const yesterday = formatDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
    writeEvents(vaultDir, today, [
      { time: '09:00', category: 'document', description: 'a' },
    ]);
    writeEvents(vaultDir, yesterday, [
      { time: '10:00', category: 'document', description: 'b' },
    ]);

    const result = handleActivityRead(vaultDir, { last_days: 2 });
    expect(result.notes).toHaveLength(2);
    expect(result.total_entries).toBe(2);
  });

  it('last_days 최대값은 30으로 제한된다', () => {
    const result = handleActivityRead(vaultDir, { last_days: 100 });
    expect(result.notes).toHaveLength(0);
  });

  it('date와 last_days 동시 지정 시 date가 우선한다', () => {
    writeEvents(vaultDir, '2026-06-21', sample);

    const result = handleActivityRead(vaultDir, {
      date: '2026-06-21',
      last_days: 7,
    });
    expect(result.notes).toHaveLength(1);
    expect(result.notes[0].date).toBe('2026-06-21');
  });

  it('손상된 라인은 건너뛰고 정상 라인만 반환한다', () => {
    const filePath = getActivityEventPath(vaultDir, '2026-06-21');
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(
      filePath,
      [
        JSON.stringify({
          time: '09:00',
          category: 'document',
          description: 'ok',
        }),
        '{broken json',
        JSON.stringify({
          time: '09:05',
          category: 'search',
          description: 'ok2',
        }),
      ].join('\n') + '\n',
      'utf-8',
    );

    const result = handleActivityRead(vaultDir, { date: '2026-06-21' });
    expect(result.notes[0].entries).toHaveLength(2);
  });
});
