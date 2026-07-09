/**
 * @file getRecentSessionSummary.ts
 * @description 직전(마감된) 세션 요약을 사람이 읽기 좋은 문자열로 반환한다.
 * 최근 1~2개 일자 파일만 읽으므로 전수조사가 필요 없다.
 */
import { existsSync, readdirSync } from 'node:fs';

import type { SessionRecord } from '../../../types/session.js';

import { getSessionsDir } from './getSessionsDir.js';
import { readDayLog } from './readDayLog.js';

export function getRecentSessionSummary(cwd: string): string | null {
  const dir = getSessionsDir(cwd);
  if (!existsSync(dir)) return null;

  let dayFiles: string[];
  try {
    dayFiles = readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .sort()
      .reverse();
  } catch {
    return null;
  }

  for (const file of dayFiles.slice(0, 2)) {
    const log = readDayLog(cwd, file.replace(/\.json$/, ''));
    const completed = Object.values(log.sessions).filter((s) => s.endedAt);
    if (completed.length === 0) continue;
    completed.sort((a, b) => (a.endedAt! < b.endedAt! ? 1 : -1));
    return formatSummary(completed[0]);
  }

  return null;
}

function formatSummary(record: SessionRecord): string {
  const ended = record.endedAt
    ? record.endedAt.slice(0, 16).replace('T', ' ')
    : 'unknown';
  const lines = [`- Last session ended ${ended} (${record.sessionId})`];
  if (record.filesModified.length > 0)
    lines.push(`- Files modified: ${record.filesModified.length}`);

  if (record.skillsUsed.length > 0)
    lines.push(`- Skills: ${record.skillsUsed.join(', ')}`);

  if (record.vaultOps && Object.keys(record.vaultOps).length > 0) {
    const ops = Object.entries(record.vaultOps)
      .map(([tool, count]) => `${tool}:${count}`)
      .join(', ');
    lines.push(`- Vault ops: ${ops}`);
  }
  return lines.join('\n');
}
