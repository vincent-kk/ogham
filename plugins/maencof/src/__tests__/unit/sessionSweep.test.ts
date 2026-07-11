/**
 * @file sessionSweep.test.ts
 * @description touchSessionActivity + sweepStaleSessions 유닛 테스트 —
 * SessionEnd 훅 대체 경로(훅이 기록, sweep 이 완결)의 계약 검증.
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

import { sweepStaleSessions } from '../../core/sessionStore/index.js';
import { recordSessionStart } from '../../core/sessionStore/operations/recordSessionStart.js';
import { touchSessionActivity } from '../../core/sessionStore/operations/touchSessionActivity.js';
import type { SessionDayLog, SessionRecord } from '../../types/session.js';

const MIN = 60_000;
const THRESHOLD = 30 * MIN;

let vaultDir: string;

function sessionsDir(): string {
  return join(vaultDir, '.maencof-meta', 'activity', 'sessions');
}

function readDay(date: string): SessionDayLog {
  return JSON.parse(
    readFileSync(join(sessionsDir(), `${date}.json`), 'utf-8'),
  ) as SessionDayLog;
}

function writeUsageStats(counts: Record<string, number>): void {
  writeFileSync(
    join(vaultDir, '.maencof-meta', 'usage-stats.json'),
    JSON.stringify(counts),
  );
}

function dateOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

beforeEach(() => {
  vaultDir = mkdtempSync(join(tmpdir(), 'maencof-sweep-'));
  mkdirSync(join(vaultDir, '.maencof'), { recursive: true });
  mkdirSync(join(vaultDir, '.maencof-meta'), { recursive: true });
});

afterEach(() => {
  rmSync(vaultDir, { recursive: true, force: true });
});

describe('touchSessionActivity', () => {
  // Test 1 (basic): touch stamps lastActivityAt + usageSnapshot on the record
  it('updates lastActivityAt and usageSnapshot on an open session', () => {
    const t0 = new Date('2026-07-11T10:00:00Z');
    writeUsageStats({ kg_search: 1 });
    recordSessionStart(vaultDir, 's1', t0);

    writeUsageStats({ kg_search: 4 });
    const t1 = new Date('2026-07-11T10:05:00Z');
    touchSessionActivity(vaultDir, 's1', t1);

    const record = readDay(dateOf(t1)).sessions['s1'];
    expect(record.lastActivityAt).toBe(t1.toISOString());
    expect(record.usageSnapshot).toEqual({ kg_search: 4 });
    expect(record.usageBaseline).toEqual({ kg_search: 1 });
  });

  // Test 2 (basic): a touch on a swept-closed record reopens it
  it('reopens a mis-closed session: clears endedAt and vaultOps', () => {
    const t0 = new Date('2026-07-11T10:00:00Z');
    recordSessionStart(vaultDir, 's1', t0);
    sweepStaleSessions(vaultDir, {
      staleThresholdMs: 0,
      now: new Date('2026-07-11T11:00:00Z'),
    });
    expect(readDay(dateOf(t0)).sessions['s1'].endedAt).toBeDefined();

    touchSessionActivity(vaultDir, 's1', new Date('2026-07-11T11:01:00Z'));

    const record = readDay(dateOf(t0)).sessions['s1'];
    expect(record.endedAt).toBeUndefined();
    expect(record.vaultOps).toBeUndefined();
    expect(record.usageBaseline).toBeDefined();
  });

  // Test 3 (complex): missing record — touch creates one with a baseline
  it('creates the record (with baseline) when SessionStart was missed', () => {
    writeUsageStats({ capture_insight: 2 });
    const t = new Date('2026-07-11T09:00:00Z');
    touchSessionActivity(vaultDir, 'orphan', t);

    const record = readDay(dateOf(t)).sessions['orphan'];
    expect(record.startedAt).toBe(t.toISOString());
    expect(record.usageBaseline).toEqual({ capture_insight: 2 });
    expect(record.lastActivityAt).toBe(t.toISOString());
  });

  // Test 4 (complex): midnight crossover — touch finds yesterday's record
  it('touches a session recorded on a prior day instead of duplicating', () => {
    // local-time constructor: formatDate is local, so this always crosses midnight
    const y = new Date(2026, 6, 10, 23, 50);
    recordSessionStart(vaultDir, 'night', y);
    const t = new Date(2026, 6, 11, 0, 10);
    touchSessionActivity(vaultDir, 'night', t);

    expect(readDay(dateOf(y)).sessions['night'].lastActivityAt).toBe(
      t.toISOString(),
    );
    expect(existsSync(join(sessionsDir(), `${dateOf(t)}.json`))).toBe(false);
  });
});

describe('sweepStaleSessions', () => {
  // Test 5 (basic): stale open session is closed at lastActivityAt with snapshot diff
  it('closes a stale session: endedAt = lastActivityAt, vaultOps = snapshot - baseline', () => {
    const t0 = new Date('2026-07-11T10:00:00Z');
    writeUsageStats({ kg_search: 1 });
    recordSessionStart(vaultDir, 's1', t0);
    writeUsageStats({ kg_search: 5, capture_insight: 2 });
    const t1 = new Date('2026-07-11T10:10:00Z');
    touchSessionActivity(vaultDir, 's1', t1);

    // counts move AFTER the last activity — must not leak into vaultOps (H4)
    writeUsageStats({ kg_search: 9, capture_insight: 7 });
    const result = sweepStaleSessions(vaultDir, {
      staleThresholdMs: THRESHOLD,
      now: new Date(t1.getTime() + THRESHOLD + MIN),
    });

    const record = readDay(dateOf(t0)).sessions['s1'];
    expect(result.closed).toBe(1);
    expect(record.endedAt).toBe(t1.toISOString());
    expect(record.vaultOps).toEqual({ kg_search: 4, capture_insight: 2 });
    expect(record.usageBaseline).toBeDefined();
    expect(record.usageSnapshot).toBeDefined();
  });

  // Test 6 (complex): active session under the threshold is left open
  it('keeps a recently-active session open', () => {
    const t0 = new Date('2026-07-11T10:00:00Z');
    recordSessionStart(vaultDir, 'live', t0);
    touchSessionActivity(vaultDir, 'live', new Date('2026-07-11T10:20:00Z'));

    const result = sweepStaleSessions(vaultDir, {
      staleThresholdMs: THRESHOLD,
      now: new Date('2026-07-11T10:30:00Z'),
    });

    expect(result.closed).toBe(0);
    expect(readDay(dateOf(t0)).sessions['live'].endedAt).toBeUndefined();
  });

  // Test 7 (complex): precise mode closes only the named session, at `now`
  it('precise mode (sessionId) closes that session immediately, others untouched', () => {
    const t0 = new Date('2026-07-11T10:00:00Z');
    recordSessionStart(vaultDir, 'own', t0);
    recordSessionStart(vaultDir, 'other', t0);
    touchSessionActivity(vaultDir, 'own', new Date('2026-07-11T10:01:00Z'));
    touchSessionActivity(vaultDir, 'other', new Date('2026-07-11T10:01:00Z'));

    const now = new Date('2026-07-11T10:02:00Z');
    const result = sweepStaleSessions(vaultDir, {
      staleThresholdMs: THRESHOLD,
      sessionId: 'own',
      now,
    });

    const sessions = readDay(dateOf(t0)).sessions;
    expect(result.closed).toBe(1);
    expect(sessions['own'].endedAt).toBe(now.toISOString());
    expect(sessions['other'].endedAt).toBeUndefined();
  });

  // Test 8 (complex): sweep → reopen → sweep re-diffs idempotently
  it('re-closes a reopened session with a fresh snapshot diff', () => {
    const t0 = new Date('2026-07-11T10:00:00Z');
    writeUsageStats({ kg_search: 1 });
    recordSessionStart(vaultDir, 's1', t0);
    writeUsageStats({ kg_search: 3 });
    touchSessionActivity(vaultDir, 's1', new Date('2026-07-11T10:05:00Z'));
    sweepStaleSessions(vaultDir, {
      staleThresholdMs: 0,
      now: new Date('2026-07-11T10:06:00Z'),
    });

    writeUsageStats({ kg_search: 6 });
    const t2 = new Date('2026-07-11T10:07:00Z');
    touchSessionActivity(vaultDir, 's1', t2);
    const result = sweepStaleSessions(vaultDir, {
      staleThresholdMs: 0,
      now: new Date('2026-07-11T10:08:00Z'),
    });

    const record = readDay(dateOf(t0)).sessions['s1'];
    expect(result.closed).toBe(1);
    expect(record.endedAt).toBe(t2.toISOString());
    expect(record.vaultOps).toEqual({ kg_search: 5 });
  });

  // Test 9 (complex): already-closed records are skipped (idempotent no-op)
  it('is a no-op when every session is already closed', () => {
    const t0 = new Date('2026-07-11T10:00:00Z');
    recordSessionStart(vaultDir, 's1', t0);
    sweepStaleSessions(vaultDir, { staleThresholdMs: 0, now: t0 });

    const again = sweepStaleSessions(vaultDir, {
      staleThresholdMs: 0,
      now: new Date('2026-07-11T12:00:00Z'),
    });

    expect(again.closed).toBe(0);
  });

  // Test 10 (complex): a session without any touch falls back to startedAt
  it('closes an untouched stale session at startedAt without vaultOps', () => {
    const t0 = new Date('2026-07-11T08:00:00Z');
    writeUsageStats({ kg_search: 1 });
    recordSessionStart(vaultDir, 'silent', t0);

    sweepStaleSessions(vaultDir, {
      staleThresholdMs: THRESHOLD,
      now: new Date('2026-07-11T09:00:00Z'),
    });

    const record = readDay(dateOf(t0)).sessions['silent'];
    expect(record.endedAt).toBe(t0.toISOString());
    expect(record.vaultOps).toBeUndefined();
  });

  // Test 11 (complex): closing writes the day digest for affected dates
  it('rebuilds the daily digest for dates it closed', () => {
    const t0 = new Date('2026-07-11T10:00:00Z');
    recordSessionStart(vaultDir, 's1', t0);
    touchSessionActivity(vaultDir, 's1', new Date('2026-07-11T10:10:00Z'));

    const result = sweepStaleSessions(vaultDir, {
      staleThresholdMs: 0,
      now: new Date('2026-07-11T11:00:00Z'),
    });

    expect(result.dates).toEqual([dateOf(t0)]);
    const digestPath = join(
      vaultDir,
      '.maencof-meta',
      'activity',
      'digests',
      'daily',
      `${dateOf(t0)}.json`,
    );
    const digest = JSON.parse(readFileSync(digestPath, 'utf-8')) as {
      sessionCount: number;
    };
    expect(digest.sessionCount).toBe(1);
  });

  // Test 12 (complex): corrupt lastActivityAt is skipped, not crashed on
  it('skips records with unparsable timestamps', () => {
    const t0 = new Date('2026-07-11T10:00:00Z');
    recordSessionStart(vaultDir, 'bad', t0);
    const log = readDay(dateOf(t0));
    (log.sessions['bad'] as SessionRecord).lastActivityAt = 'not-a-date';
    (log.sessions['bad'] as SessionRecord).startedAt = 'also-bad';
    writeFileSync(
      join(sessionsDir(), `${dateOf(t0)}.json`),
      JSON.stringify(log),
    );

    const result = sweepStaleSessions(vaultDir, {
      staleThresholdMs: 0,
      now: new Date('2026-07-11T12:00:00Z'),
    });

    expect(result.closed).toBe(0);
  });
});
