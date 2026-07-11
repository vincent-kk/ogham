/**
 * @file sessionStore.test.ts
 * @description sessionStore core 모듈 유닛 테스트 — 일자별 JSON 세션 기록 + 차분.
 */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  getRecentSessionSummary,
  getSessionDayPath,
  recordSessionStart,
  sweepStaleSessions,
} from '../../../core/sessionStore/index.js';
import type { SessionDayLog } from '../../../types/session.js';

let vaultDir: string;

beforeEach(() => {
  vaultDir = mkdtempSync(join(tmpdir(), 'maencof-sessionstore-'));
  mkdirSync(join(vaultDir, '.maencof-meta'), { recursive: true });
});

afterEach(() => {
  rmSync(vaultDir, { recursive: true, force: true });
});

function writeUsageStats(stats: Record<string, unknown>): void {
  writeFileSync(
    join(vaultDir, '.maencof-meta', 'usage-stats.json'),
    JSON.stringify(stats),
    'utf-8',
  );
}

function readDay(date: string): SessionDayLog {
  return JSON.parse(
    readFileSync(getSessionDayPath(vaultDir, date), 'utf-8'),
  ) as SessionDayLog;
}

describe('recordSessionStart', () => {
  it('당일 파일에 세션 레코드와 usageBaseline 을 생성한다', () => {
    writeUsageStats({ create: 4, read: 2 });
    recordSessionStart(vaultDir, 's1', new Date(2026, 5, 21, 10, 0));

    const log = readDay('2026-06-21');
    expect(log.sessions['s1'].startedAt).toBeTruthy();
    expect(log.sessions['s1'].usageBaseline).toEqual({ create: 4, read: 2 });
  });

  it('손상된 일자 파일은 빈 로그로 폴백하고 정상 기록한다', () => {
    mkdirSync(join(vaultDir, '.maencof-meta', 'activity', 'sessions'), {
      recursive: true,
    });
    writeFileSync(
      getSessionDayPath(vaultDir, '2026-06-21'),
      '{bad json',
      'utf-8',
    );

    recordSessionStart(vaultDir, 's1', new Date(2026, 5, 21, 10, 0));
    const log = readDay('2026-06-21');
    expect(log.sessions['s1']).toBeDefined();
  });
});

describe('getRecentSessionSummary', () => {
  it('세션이 없으면 null 을 반환한다', () => {
    expect(getRecentSessionSummary(vaultDir)).toBeNull();
  });

  it('가장 최근 마감 세션 요약을 반환한다', () => {
    writeUsageStats({ create: 0 });
    recordSessionStart(vaultDir, 's1', new Date(2026, 5, 21, 10, 0));
    writeUsageStats({ create: 2 });
    sweepStaleSessions(vaultDir, {
      staleThresholdMs: 0,
      sessionId: 's1',
      now: new Date(2026, 5, 21, 11, 0),
    });

    const summary = getRecentSessionSummary(vaultDir);
    expect(summary).toContain('Last session ended');
    expect(summary).toContain('s1');
    expect(summary).toContain('Vault ops');
  });
});
