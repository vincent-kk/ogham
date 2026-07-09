/**
 * @file recordSessionStart.ts
 * @description 세션 시작을 기록한다. 당일 파일에 레코드를 생성하고 누적 통계 baseline 을 스냅샷한다.
 * 같은 session_id 가 이미 있으면(재개) 시작 시각을 보존하고 baseline 만 보강한다.
 */
import { formatDate } from '../../dateFormat/index.js';

import { readDayLog } from './readDayLog.js';
import { readUsageCounts } from './readUsageCounts.js';
import { writeDayLog } from './writeDayLog.js';

export function recordSessionStart(
  cwd: string,
  sessionId: string,
  now: Date = new Date(),
): void {
  const date = formatDate(now);
  const log = readDayLog(cwd, date);
  const existing = log.sessions[sessionId];

  if (existing) {
    if (!existing.usageBaseline) existing.usageBaseline = readUsageCounts(cwd);
  } else
    log.sessions[sessionId] = {
      sessionId,
      startedAt: now.toISOString(),
      skillsUsed: [],
      filesModified: [],
      usageBaseline: readUsageCounts(cwd),
    };

  writeDayLog(cwd, log);
}
