/**
 * @file buildDailyDigest.ts
 * @description 일일 작업 digest 를 멱등 재계산해 기록한다.
 * 세션(sessionStore)에서 세션수·소요시간·vaultOps 합산, 활동 로그(activityLog)에서
 * 문서 경로 → 레이어/토픽을 추론한다.
 */
import { mkdirSync, writeFileSync } from 'node:fs';

import { MAX_DIGEST_PATHS } from '../../../constants/workIndex.js';
import type { DailyDigest } from '../../../types/workHistory.js';
import { readActivityEvents } from '../../activityLog/index.js';
import { readSessionDayLog } from '../../sessionStore/index.js';

import { getDailyDigestDir } from './getDailyDigestDir.js';
import { getDailyDigestPath } from './getDailyDigestPath.js';
import { inferTopicsLayers } from './inferTopicsLayers.js';

export function buildDailyDigest(cwd: string, date: string): void {
  const sessions = Object.values(readSessionDayLog(cwd, date).sessions);
  const activity = readActivityEvents(cwd, date);

  let totalDurationMin = 0;
  const vaultOps: Record<string, number> = {};
  for (const session of sessions) {
    if (session.startedAt && session.endedAt) {
      const ms = Date.parse(session.endedAt) - Date.parse(session.startedAt);
      if (ms > 0) totalDurationMin += Math.round(ms / 60000);
    }
    for (const [tool, count] of Object.entries(session.vaultOps ?? {}))
      vaultOps[tool] = (vaultOps[tool] ?? 0) + count;
  }

  const paths = [
    ...new Set(
      activity
        .filter((entry) => entry.category === 'document' && entry.path)
        .map((entry) => entry.path as string),
    ),
  ];
  const { layers, topics } = inferTopicsLayers(paths);

  const digest: DailyDigest = {
    date,
    sessionCount: sessions.length,
    totalDurationMin,
    vaultOps,
    filePaths: paths.slice(0, MAX_DIGEST_PATHS),
    layers,
    topics,
  };

  mkdirSync(getDailyDigestDir(cwd), { recursive: true });
  writeFileSync(
    getDailyDigestPath(cwd, date),
    JSON.stringify(digest, null, 2) + '\n',
    'utf-8',
  );
}
