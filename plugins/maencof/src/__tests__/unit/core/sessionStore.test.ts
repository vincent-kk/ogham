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
  recordSessionEnd,
  recordSessionStart,
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
});

describe('recordSessionEnd', () => {
  it('endedAt 과 skills/files 를 기록한다', () => {
    recordSessionEnd(vaultDir, {
      sessionId: 's1',
      skillsUsed: ['/maencof:search'],
      filesModified: ['02_Derived/a.md'],
      now: new Date(2026, 5, 21, 12, 0),
    });

    const log = readDay('2026-06-21');
    expect(log.sessions['s1'].endedAt).toBeTruthy();
    expect(log.sessions['s1'].skillsUsed).toEqual(['/maencof:search']);
    expect(log.sessions['s1'].filesModified).toEqual(['02_Derived/a.md']);
  });

  it('start→end 가 같은 날 한 파일에 누적되고 usageBaseline 은 제거된다', () => {
    const now = new Date(2026, 5, 21, 10, 0);
    writeUsageStats({ create: 1 });
    recordSessionStart(vaultDir, 's1', now);
    recordSessionEnd(vaultDir, {
      sessionId: 's1',
      now: new Date(2026, 5, 21, 11, 0),
    });

    const log = readDay('2026-06-21');
    expect(Object.keys(log.sessions)).toEqual(['s1']);
    expect(log.sessions['s1'].startedAt).toBeTruthy();
    expect(log.sessions['s1'].endedAt).toBeTruthy();
    expect('usageBaseline' in log.sessions['s1']).toBe(false);
  });

  it('vaultOps 는 baseline 대비 차분만 기록한다 (누적·비숫자 키 제외)', () => {
    writeUsageStats({
      skills: {},
      agents: {},
      last_updated: null,
      create: 10,
      read: 5,
    });
    recordSessionStart(vaultDir, 's1', new Date(2026, 5, 21, 10, 0));
    writeUsageStats({ create: 13, read: 5, kg_search: 2 });
    recordSessionEnd(vaultDir, {
      sessionId: 's1',
      now: new Date(2026, 5, 21, 11, 0),
    });

    const log = readDay('2026-06-21');
    expect(log.sessions['s1'].vaultOps).toEqual({ create: 3, kg_search: 2 });
  });

  it('start 없이 end 만 오면 baseline 이 없으므로 vaultOps 를 남기지 않는다', () => {
    writeUsageStats({ create: 99 });
    recordSessionEnd(vaultDir, {
      sessionId: 'orphan',
      now: new Date(2026, 5, 21, 11, 0),
    });

    const log = readDay('2026-06-21');
    expect(log.sessions['orphan'].endedAt).toBeTruthy();
    expect('vaultOps' in log.sessions['orphan']).toBe(false);
  });

  it('자정 교차 세션은 시작 일자 파일에서 마감되고 종료 일자 파일을 만들지 않는다', () => {
    recordSessionStart(vaultDir, 'x', new Date(2026, 5, 21, 23, 30));
    recordSessionEnd(vaultDir, {
      sessionId: 'x',
      now: new Date(2026, 5, 22, 0, 30),
    });

    const dayA = readDay('2026-06-21');
    expect(dayA.sessions['x'].endedAt).toBeTruthy();
    expect(existsSync(getSessionDayPath(vaultDir, '2026-06-22'))).toBe(false);
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
    recordSessionEnd(vaultDir, {
      sessionId: 's1',
      filesModified: ['02_Derived/a.md'],
      now: new Date(2026, 5, 21, 11, 0),
    });

    const summary = getRecentSessionSummary(vaultDir);
    expect(summary).toContain('Last session ended');
    expect(summary).toContain('s1');
    expect(summary).toContain('Vault ops');
  });
});
