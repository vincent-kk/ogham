/**
 * @file sweepStaleSessions.ts
 * @description 미마감 세션 레코드를 마감한다 — SessionEnd 훅 대체의 완결 경로.
 *
 * 두 모드:
 * - **sweep** (기본, MCP boot): 최근 일자 창에서 `(lastActivityAt ?? startedAt)` 이
 *   임계보다 오래된 미마감 레코드를 `endedAt = lastActivityAt` 로 마감.
 * - **정밀** (`sessionId` 지정, MCP shutdown): 해당 세션만 임계 무시하고
 *   `endedAt = now` 로 즉시 마감.
 *
 * 마감은 잠정적 — baseline/snapshot/lastActivityAt 을 보존하므로 살아있는 세션의
 * 오마감은 다음 touch 가 재개방하고, 이후 sweep 이 멱등 재차분한다.
 * `vaultOps = usageSnapshot - usageBaseline` (sweep 시점 카운트를 쓰지 않아
 * 동시·후속 세션의 작업이 섞이지 않는다). 마감이 발생한 일자(`dates`)는
 * 호출부(bootSweep/registerShutdown)가 digest 를 멱등 재생성하도록 반환한다.
 */
import { existsSync, readdirSync } from 'node:fs';

import { SESSION_SWEEP_DAY_WINDOW } from '../../../constants/sessionSweep.js';
import type { SessionRecord } from '../../../types/session.js';

import { diffUsageCounts } from './diffUsageCounts.js';
import { getSessionsDir } from './getSessionsDir.js';
import { readDayLog } from './readDayLog.js';
import { readUsageCounts } from './readUsageCounts.js';
import { writeDayLog } from './writeDayLog.js';

export interface SweepOptions {
  /** 무활동 판정 임계 (ms). 정밀 모드에서는 무시된다. */
  staleThresholdMs: number;
  /** 지정 시 해당 세션만 즉시 마감 (shutdown 정밀 모드) */
  sessionId?: string;
  now?: Date;
}

export interface SweepResult {
  closed: number;
  dates: string[];
}

export function sweepStaleSessions(
  cwd: string,
  options: SweepOptions,
): SweepResult {
  const now = options.now ?? new Date();
  const closedDates: string[] = [];
  let closed = 0;

  for (const date of recentDates(cwd)) {
    const log = readDayLog(cwd, date);
    let dirty = false;

    for (const record of Object.values(log.sessions)) {
      if (record.endedAt) continue;
      if (!shouldClose(record, options, now)) continue;
      closeRecord(cwd, record, options, now);
      dirty = true;
      closed++;
    }

    if (dirty) {
      writeDayLog(cwd, log);
      closedDates.push(date);
    }
  }

  return { closed, dates: closedDates };
}

function shouldClose(
  record: SessionRecord,
  options: SweepOptions,
  now: Date,
): boolean {
  if (options.sessionId) return record.sessionId === options.sessionId;
  const lastSeen = Date.parse(record.lastActivityAt ?? record.startedAt);
  if (Number.isNaN(lastSeen)) return false;
  return now.getTime() - lastSeen >= options.staleThresholdMs;
}

function closeRecord(
  cwd: string,
  record: SessionRecord,
  options: SweepOptions,
  now: Date,
): void {
  record.endedAt = options.sessionId
    ? now.toISOString()
    : (record.lastActivityAt ?? record.startedAt);

  if (record.usageBaseline) {
    // 정밀 모드는 지금 끝나는 자기 세션이므로 현재 카운트 폴백이 오염 없음
    const snapshot =
      record.usageSnapshot ??
      (options.sessionId ? readUsageCounts(cwd) : undefined);
    if (snapshot) {
      const delta = diffUsageCounts(record.usageBaseline, snapshot);
      if (Object.keys(delta).length > 0) record.vaultOps = delta;
    }
  }
}

/** 당일 우선, 최근 일자 파일 순 (창 크기 고정 — 전수조사 금지) */
function recentDates(cwd: string): string[] {
  const dir = getSessionsDir(cwd);
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .sort()
      .reverse()
      .slice(0, SESSION_SWEEP_DAY_WINDOW)
      .map((f) => f.replace(/\.json$/, ''));
  } catch {
    return [];
  }
}
