/**
 * @file recordSessionEnd.ts
 * @description 세션 종료를 기록한다. 진행 중 레코드를 찾아(당일 → 직전 일자) 마감하고,
 * baseline 대비 누적 통계 차분으로 `vaultOps` 를 산출한다.
 */
import { existsSync, readdirSync } from 'node:fs';

import type { SessionDayLog } from '../../../types/session.js';
import { formatDate } from '../../dateFormat/index.js';

import { getSessionsDir } from './getSessionsDir.js';
import { readDayLog } from './readDayLog.js';
import { readUsageCounts } from './readUsageCounts.js';
import { writeDayLog } from './writeDayLog.js';

export function recordSessionEnd(
  cwd: string,
  params: {
    sessionId: string;
    skillsUsed?: string[];
    filesModified?: string[];
    now?: Date;
  },
): string {
  const now = params.now ?? new Date();
  const date = formatDate(now);
  const log = findOpenSessionDay(cwd, params.sessionId, date);

  let record = log.sessions[params.sessionId];
  if (!record) {
    record = {
      sessionId: params.sessionId,
      startedAt: now.toISOString(),
      skillsUsed: [],
      filesModified: [],
    };
    log.sessions[params.sessionId] = record;
  }

  record.endedAt = now.toISOString();
  record.skillsUsed = params.skillsUsed ?? record.skillsUsed;
  record.filesModified = params.filesModified ?? record.filesModified;

  if (record.usageBaseline) {
    const delta = diffUsageCounts(record.usageBaseline, readUsageCounts(cwd));
    if (Object.keys(delta).length > 0) record.vaultOps = delta;
    delete record.usageBaseline;
  }

  writeDayLog(cwd, log);
  return log.date;
}

/** 세션이 속한 일자 로그를 찾는다: 당일 → 직전 일자의 미마감 레코드 → 당일(신규). */
function findOpenSessionDay(
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
        const record = log.sessions[sessionId];
        if (record && !record.endedAt) return log;
      }
    } catch {
      /* ignore directory read errors */
    }

  return todayLog;
}

function diffUsageCounts(
  baseline: Record<string, number>,
  current: Record<string, number>,
): Record<string, number> {
  const delta: Record<string, number> = {};
  for (const [tool, count] of Object.entries(current)) {
    const diff = count - (baseline[tool] ?? 0);
    if (diff > 0) delta[tool] = diff;
  }
  return delta;
}
