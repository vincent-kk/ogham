/**
 * @file touchSessionActivity.ts
 * @description 매 턴 세션 활동을 기록한다. `lastActivityAt`/`usageSnapshot` 을 갱신하고,
 * sweep 이 오마감한 살아있는 세션은 `endedAt`/`vaultOps` 를 지워 재개방한다.
 * 레코드가 없으면 생성한다(SessionStart 누락 방어 — baseline 포함).
 */
import { existsSync, readdirSync } from 'node:fs';

import type { SessionDayLog } from '../../../types/session.js';
import { formatDate } from '../../dateFormat/operations/formatDate.js';

import { getSessionsDir } from './getSessionsDir.js';
import { readDayLog } from './readDayLog.js';
import { readUsageCounts } from './readUsageCounts.js';
import { writeDayLog } from './writeDayLog.js';

export function touchSessionActivity(
  cwd: string,
  sessionId: string,
  now: Date = new Date(),
): void {
  const log = findSessionDay(cwd, sessionId, formatDate(now));
  const counts = readUsageCounts(cwd);

  let record = log.sessions[sessionId];
  if (!record) {
    record = {
      sessionId,
      startedAt: now.toISOString(),
      skillsUsed: [],
      filesModified: [],
      usageBaseline: counts,
    };
    log.sessions[sessionId] = record;
  }

  record.lastActivityAt = now.toISOString();
  record.usageSnapshot = counts;
  if (record.endedAt) {
    delete record.endedAt;
    delete record.vaultOps;
  }

  writeDayLog(cwd, log);
}

/** 세션이 속한 일자 로그를 찾는다: 당일 → 직전 일자(마감 여부 무관) → 당일(신규). */
function findSessionDay(
  cwd: string,
  sessionId: string,
  today: string,
): SessionDayLog {
  const todayLog = readDayLog(cwd, today);
  if (todayLog.sessions[sessionId]) return todayLog;

  const dir = getSessionsDir(cwd);
  if (existsSync(dir))
    try {
      const priorFiles = readdirSync(dir)
        .filter((f) => f.endsWith('.json') && f !== `${today}.json`)
        .sort()
        .reverse();
      for (const file of priorFiles.slice(0, 2)) {
        const log = readDayLog(cwd, file.replace(/\.json$/, ''));
        if (log.sessions[sessionId]) return log;
      }
    } catch {
      /* ignore directory read errors */
    }

  return todayLog;
}
