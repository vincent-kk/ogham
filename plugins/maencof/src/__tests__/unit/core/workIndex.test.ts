/**
 * @file workIndex.test.ts
 * @description workIndex — daily digest 생성, 기간 집계, 토픽/레이어 역색인, 추론.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { appendActivityEvent } from '../../../core/activityLog/index.js';
import {
  recordSessionStart,
  sweepStaleSessions,
} from '../../../core/sessionStore/index.js';
import {
  aggregatePeriod,
  buildDailyDigest,
  inferTopicsLayers,
  queryWork,
  readDailyDigest,
} from '../../../core/workIndex/index.js';

let vaultDir: string;

beforeEach(() => {
  vaultDir = mkdtempSync(join(tmpdir(), 'maencof-workindex-'));
  mkdirSync(join(vaultDir, '.maencof-meta'), { recursive: true });
});

afterEach(() => {
  rmSync(vaultDir, { recursive: true, force: true });
});

function writeUsage(stats: Record<string, number>): void {
  writeFileSync(
    join(vaultDir, '.maencof-meta', 'usage-stats.json'),
    JSON.stringify(stats),
    'utf-8',
  );
}

describe('inferTopicsLayers', () => {
  it('레이어 디렉터리와 파일명 stem 을 추출한다', () => {
    const { layers, topics } = inferTopicsLayers([
      '01_Core/alpha.md',
      '03_External/topical/beta.md',
    ]);
    expect(layers.sort()).toEqual(['01_Core', '03_External']);
    expect(topics.sort()).toEqual(['alpha', 'beta']);
  });

  it('레이어 폴더 밖 경로는 layers 에서 제외하고 stem 만 토픽으로 쓴다', () => {
    const { layers, topics } = inferTopicsLayers(['notes/random.md']);
    expect(layers).toEqual([]);
    expect(topics).toEqual(['random']);
  });

  it('stem 이 비면 uncategorized 로 떨어진다', () => {
    const { topics } = inferTopicsLayers(['01_Core/']);
    expect(topics).toEqual(['uncategorized']);
  });
});

describe('buildDailyDigest', () => {
  it('세션(vaultOps·소요시간)과 활동(경로→레이어/토픽)을 합쳐 롤업한다', () => {
    const start = new Date(2026, 5, 21, 10, 0);
    writeUsage({ create: 0 });
    recordSessionStart(vaultDir, 's1', start);
    writeUsage({ create: 3, update: 1 });
    sweepStaleSessions(vaultDir, {
      staleThresholdMs: 0,
      sessionId: 's1',
      now: new Date(2026, 5, 21, 11, 0),
    });

    appendActivityEvent(
      vaultDir,
      {
        time: '10:30',
        category: 'document',
        description: 'created',
        path: '01_Core/alpha.md',
      },
      start,
    );
    appendActivityEvent(
      vaultDir,
      {
        time: '10:40',
        category: 'document',
        description: 'updated',
        path: '03_External/topical/beta.md',
      },
      start,
    );
    appendActivityEvent(
      vaultDir,
      { time: '10:45', category: 'search', description: 'kg search' },
      start,
    );

    buildDailyDigest(vaultDir, '2026-06-21');
    const digest = readDailyDigest(vaultDir, '2026-06-21');

    expect(digest).not.toBeNull();
    expect(digest!.sessionCount).toBe(1);
    expect(digest!.totalDurationMin).toBe(60);
    expect(digest!.vaultOps).toEqual({ create: 3, update: 1 });
    expect(digest!.layers.sort()).toEqual(['01_Core', '03_External']);
    expect(digest!.topics.sort()).toEqual(['alpha', 'beta']);
    expect(digest!.filePaths).toHaveLength(2); // search(경로 없음)는 제외
  });

  it('멱등 재계산 — 두 번 호출해도 동일 결과', () => {
    recordSessionStart(vaultDir, 's1', new Date(2026, 5, 21, 9, 0));
    sweepStaleSessions(vaultDir, {
      staleThresholdMs: 0,
      sessionId: 's1',
      now: new Date(2026, 5, 21, 9, 30),
    });
    buildDailyDigest(vaultDir, '2026-06-21');
    buildDailyDigest(vaultDir, '2026-06-21');
    const digest = readDailyDigest(vaultDir, '2026-06-21');
    expect(digest!.sessionCount).toBe(1);
    expect(digest!.totalDurationMin).toBe(30);
  });
});

describe('aggregatePeriod', () => {
  function seedDay(date: string, path: string): void {
    appendActivityEvent(
      vaultDir,
      { time: '10:00', category: 'document', description: 'c', path },
      new Date(`${date}T10:00:00`),
    );
    buildDailyDigest(vaultDir, date);
  }

  it('기간 내 daily digest 을 합산하고 상위 토픽을 집계한다', () => {
    seedDay('2026-06-20', '01_Core/alpha.md');
    seedDay('2026-06-21', '01_Core/alpha.md');
    seedDay('2026-06-22', '03_External/topical/beta.md');

    const summary = aggregatePeriod(vaultDir, '2026-06-20', '2026-06-21');
    expect(summary.activeDays).toBe(2);
    expect(summary.layers).toEqual(['01_Core']);
    expect(summary.topTopics[0]).toEqual({ topic: 'alpha', days: 2 });
  });
});

describe('queryWork', () => {
  function seedDay(date: string, path: string): void {
    appendActivityEvent(
      vaultDir,
      { time: '10:00', category: 'document', description: 'c', path },
      new Date(`${date}T10:00:00`),
    );
    buildDailyDigest(vaultDir, date);
  }

  it('토픽의 작업일자 이력을 내림차순으로 반환한다 (역색인 재파생)', () => {
    seedDay('2026-06-20', '01_Core/alpha.md');
    seedDay('2026-06-22', '01_Core/alpha.md');

    const result = queryWork(vaultDir, 'topic', 'alpha');
    expect(result.lastWorkedOn).toBe('2026-06-22');
    expect(result.dates).toEqual(['2026-06-22', '2026-06-20']);
  });

  it('레이어 질의를 지원한다', () => {
    seedDay('2026-06-21', '03_External/topical/beta.md');
    const result = queryWork(vaultDir, 'layer', '03_External');
    expect(result.lastWorkedOn).toBe('2026-06-21');
  });

  it('알 수 없는 토픽은 null + 빈 배열', () => {
    seedDay('2026-06-21', '01_Core/alpha.md');
    const result = queryWork(vaultDir, 'topic', 'does-not-exist');
    expect(result.lastWorkedOn).toBeNull();
    expect(result.dates).toEqual([]);
  });
});
